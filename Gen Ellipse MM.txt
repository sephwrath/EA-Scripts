!INC Local Scripts.EAConstants-JScript
!INC EAScriptLib.JScript-String
!INC AIS Common.AIS Common
!INC AIS Common.ADO Helpers

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name:
 * Author:
 * Purpose:
 * Date:
 */
 
function executeCreate()
{
	var assemblyFolder = "Assemblies";
	var cataloguesFolder = "Component Catalogues";
	var attributionFolder = "Attribution";
	var functionalPosFolder = "Functional Position";
	
	// create a set of hash tables to cache elements that we have 
	// already dealt with and avoid doing more work than necessary
	var assHash = {};
	var compHash = {};
	var attHash = {};
	
	// checks for a hash and if it doesn't exist calls a function and adds it to the hash.
	var checkHashOrExecute = function(hash, egi, desc, runIfNotThereCallback) {
		var element;
		var name = desc + " ("+egi+")";
		if (hash[name]) {
			element = hash[name];
		} else {
			// call the callback with the name of the element to create and make sure it returns an element
			element = runIfNotThereCallback(name);
			if (!element) throw "You must return a valid element from the checkHash callback";
			hash[name] = element;
		}
		return element;
	}

	// Create a new model node
	var newModel as EA.Package;
	newModel = Repository.GetTreeSelectedPackage();
	
    // connect to an ODB database - this needs to exist as an ODBC connection
	var dbconn = new ActiveXObject("ADODB.Connection");
	dbconn.Open("DSN=Ellipse;Uid=###;Pwd=###;");
	if (dbconn == 0) throw "Unable to open connection to the ellipse database";
	
	//newModel = getPackageFromPath(Repository.Models.GetAt(0), rootPath);
	if ( newModel != null && newModel.ParentID != 0 )
	{		
		// loop through all of the Assemblies go into the folder create a diagram for the folder name
		var assemblyPack = getPackageFromPath(newModel, assemblyFolder, true);
		var functionalPosPack = getPackageFromPath(newModel, functionalPosFolder, true);
		var attributionPack = getPackageFromPath(newModel, attributionFolder, true);
		var catalougesPack = getPackageFromPath(newModel, cataloguesFolder, true);
			
		var sqlGetAssemblies = "select asby.prntegi prntegi, egi.table_desc prntdesc, asby.chldegi chldegi, egi2.table_desc chlddesc " +
				"from (select distinct level as lvl, par.equip_grp_id prntegi,  " +
				"equ.equip_grp_id chldegi  " +
				"from ellipse.msf600 equ, ellipse.msf600 par " +
				"where equ.parent_equip = par.equip_no and equ.equip_class != 'PI' and equ.equip_classifx1 = 'TA' " +
				"start with equ.equip_classifx1 = 'TA'  and equ.equip_grp_id = 'BAY' " +
				"connect by prior equ.equip_no = equ.parent_equip) asby " +
				"  , (select * from ellipse.msf010 where table_type = 'GI') egi " +
				"  , (select * from ellipse.msf010 where table_type = 'GI') egi2 " +
				"where asby.prntegi = egi.table_code " +
				"and asby.chldegi = egi2.table_code;";
		
		var sqlGetFunctionalPos = "select distinct grp.equip_grp_id lvl3egi, grp.comp_code comp " +
				", ccd.table_desc compdesc , count(cmcd.table_desc) modcount " +
				"from ellipse.msf610 grp, ellipse.msf600 equ " +
				", (select * from ellipse.msf010 where table_type = 'CO') ccd " +
				", (select * from ellipse.msf010 where table_type = 'MO') cmcd " +
				"where grp.equip_grp_id = ? " +
				"and equ.equip_grp_id = grp.equip_grp_id " +
				"and grp.comp_mod_code = cmcd.table_code(+) " +
				"and grp.comp_code = ccd.table_code " +
				"group by grp.equip_grp_id, grp.comp_code,  ccd.table_desc ; ";
				
		var sqlGetFuncPosModifiers = "select distinct grp.comp_mod_code cmod , cmcd.table_desc cmoddesc " +
				"from ellipse.msf610 grp, ellipse.msf600 equ " +
				", (select * from ellipse.msf010 where table_type = 'MO') cmcd " +
				"where grp.equip_grp_id = ? and grp.comp_code = ? " +
				"and equ.equip_grp_id = grp.equip_grp_id " +
				"and grp.comp_mod_code = cmcd.table_code; ";
				
		var sqlGetComponents = "select distinct asmby.lvl3egi, asmby.comp, asmby.cmod " +
				", lvl4.equip_grp_id compegi, egi2.table_desc compdesc " +
				"from (select * from ellipse.msf600 where equip_classifx1 = 'TA' and equip_class = 'PI') lvl4 " +
				", ellipse.msfx69 joi " +
				", (select * from ellipse.msf010 where table_type = 'GI') egi2 " +
				", (select equ.equip_no || grp.comp_code || grp.comp_mod_code lvl3join " +
				"    , grp.equip_grp_id lvl3egi, grp.comp_code comp, grp.comp_mod_code cmod " +
				"    from ellipse.msf610 grp, ellipse.msf600 equ " +
				"    where grp.equip_grp_id = ? and grp.comp_code = ? " +
				"    and equ.equip_grp_id = grp.equip_grp_id) asmby " +
				"where asmby.lvl3join = joi.install_posn(+) " +
				"and lvl4.equip_no = joi.equip_no " +
				"and lvl4.equip_grp_id = egi2.table_code;";
				
		var sqlGetAttributes = "select atts.default_value defv, atts.default_value_9 defvnum, ofgem.table_desc ofgem " +
				", att_d.attribute_name aName, att_d.attribute_desc aDesc, att_d.table_type ttyp " +
				"from ellipse.msf6A3 atts, ellipse.msf6A0 att_d " +
				"	, (select * from ellipse.msf010 where table_type = 'J5') ofgem " +
				"where atts.equip_grp_id = ? " +
				"	and atts.attribute_name = att_d.attribute_name " +
				"	and ofgem.table_code(+) = atts.default_value;";
				
		var sqlGetEnumeration = "select distinct lookup.table_code ecode, lookup.table_desc edesc " +
				", att_d.attribute_name aName, att_d.attribute_desc aDesc " +
				"from ellipse.msf6A3 atts, ellipse.msf6A0 att_d, ellipse.msf010 lookup " +
				"where att_d.table_type = ? " +
				"	and trim(att_d.table_type) is not null " +
				"	and att_d.table_type = lookup.table_type; ";
				
		var sqlGetAttributeValueEnums = "select table_type ttype, table_code tcode, " +
				"table_desc tdesc from ellipse.msf010 where table_type = ? ;";
				
		// ## ATTRIBUTE VALUE ENUMERATIONS
		// this callback is used to add a list of enumerations for a functional pos - they will
		// be specific to the fp that is currently being looked at
		var addValueListToAttribute = function(element, attDesc, tableCode) {
			// first create the enum and assign it to the element
			// (package, subpackName, parentElmt, name, elementAttName) 
			var enumElement = getAndAssignEnum(attributionPack, "Intrinsic Attributes", element
				, attDesc + ' Value', 'Value');
			
			var createAttEnumValues = function (rsModValue) {
				var enumCode = STRTrim(rsModValue.Fields.Item('tcode').Value);
				var enumDesc = STRTrim(rsModValue.Fields.Item('tdesc').Value);
				
				addEnumValueToType(enumElement, enumCode, enumDesc);
			}
			
			forEachRecordCall(dbconn, sqlGetAttributeValueEnums, createAttEnumValues, tableCode);
		}
			
			
		// 	##ATTRIBUTES
		// 	selects the attributes for a given EGI from the database and adds them
		var addAttributesToElement = function(element, elementEgi) {
			
			var intrinsicAttPack as EA.Package;
			intrinsicAttPack = getPackageFromPath(attributionPack, "Intrinsic Attributes", true);
			
			var createAttribute = function(rsAttribute) {
				var defv = STRTrim(rsAttribute.Fields.Item('defv').Value);
				var defvNum = rsAttribute.Fields.Item('defvnum').Value;
				var ofgem = rsAttribute.Fields.Item('ofgem').Value;
				ofgem = ofgem ? STRTrim(ofgem) : null;
				var aName = STRTrim(rsAttribute.Fields.Item('aName').Value);
				var aDesc = STRTrim(rsAttribute.Fields.Item('aDesc').Value);
				var ttype = STRTrim(rsAttribute.Fields.Item('ttyp').Value);
				
				if (ofgem) {
					// if this is an offgem item add it to the element directly as an attribute
					var ofgemAtt as EA.Attribute;
					ofgemAtt = createOrObtainAttribute(element, "Ofgem Code", "Intrinsic Asset Attribute"
						, "Ofgem Code", "String", ofgem);
					
				} else {
					var attributeElmt as EA.Element;
					var attributeElmt = checkHashOrExecute(attHash, "", aDesc, function(name) {
						// check for default values. Text perecidance over number and a num val of 0 == not defined.
						var defaultText = defv ? defv : (defvNum != 0 ? defvNum : "");
						defaultText = defaultText ? " Default value of " + defaultText : "";
						
						// create the attribute and create the connection
						var newAtt = createOrObtainElement(intrinsicAttPack, "Class"
							, aDesc, "Intrinsic Asset Attribute"
							, aDesc + " (" + aName + ")." + defaultText
							, aName);
						
						// if we have a referenced table go and get the list of values create an enum and return the type
						if (ttype) {
							addValueListToAttribute(newAtt, aDesc, ttype);
						} else {
							var attributeAtt as EA.Attribute;
							// parameters - parent, name, stereoType, description, attrType, attrVal
							attributeAtt = createOrObtainAttribute(newAtt, "Value", "Intrinsic Asset Attribute"
								, "", "String", defaultText);
						}
						return newAtt;
					});
					
					// connect the components to the functional positions
					addOrUpdateConnection( attributeElmt, element, "", "Generalization", "Attributes");
				}
			}
			
			forEachRecordCall(dbconn, sqlGetAttributes, createAttribute, elementEgi);
		}		
			
		
		// ## COMPONENTS
		// this is the callback we are using to create the component hierarchies and add the components
		// to each of the functional positions.
		var addCompsToFunctionalPos = function(functPosEl, assEgi, fpCode) {
			
			var createComponents = function(rsComponent) {
				var compEgi = STRTrim(rsComponent.Fields.Item('compegi').Value);
				var compDesc = STRTrim(rsComponent.Fields.Item('compdesc').Value);
				//var catPack = catalougesPack;
				// within the component Hash check add the attributes so that we only do it once
				var compElement = checkHashOrExecute(compHash, compEgi, compDesc, function(name) {
					var compElmt = addGetComponentByName(catalougesPack, compEgi, compDesc, name);
				
					addAttributesToElement(compElmt, compEgi);
					
					return compElmt;
				});
				
				// connect the components to the functional positions
				addOrUpdateConnection(functPosEl, compElement, "", "Association", "Implements");
			}
			
			var param = new Array();
			param.push(assEgi);
			param.push(fpCode);
			forEachRecordCall(dbconn, sqlGetComponents, createComponents, param);
		}
			
		
		// ## FUNCTIONAL POS MODIFIERS
		// this callback is used to add a list of enumerations for a functional pos - they will
		// be specific to the fp that is currently being looked at
		var addModifierEnumToFunctionalPos = function(fpElement, assEgi, assFPCode) {
			// first create the enum and assign it to the fpElement
			var enumElement = getAndAssignEnum(functionalPosPack, assFPCode, fpElement
				, assEgi + ' - ' + assFPCode + ' Value', 'Modifier Value');
			
			var createEnumValues = function (rsModValue) {
				var compMod = STRTrim(rsModValue.Fields.Item('cmod').Value);
				var compModDesc = STRTrim(rsModValue.Fields.Item('cmoddesc').Value);
				
				addEnumValueToType(enumElement, compMod, compModDesc);
			}
			
			var param = new Array();
			param.push(assEgi);
			param.push(assFPCode);
			forEachRecordCall(dbconn, sqlGetFuncPosModifiers, createEnumValues, param);
		}
		
		
		// ## FUNCTIONAL POSITIONS
		// this call back is used to create the functional positions for each assembly
		var addFunctionalPosToAss = function(assEl, assEgi, assDesc) {
			
			var createFunctionalPositions = function(rsFuncPos) {
				var compCode = STRTrim(rsFuncPos.Fields.Item('comp').Value);
				var compDesc = STRTrim(rsFuncPos.Fields.Item('compdesc').Value);
				var modCount = rsFuncPos.Fields.Item('modcount').Value;
				
				var fpElement = addGetFunctionalPositionByName(functionalPosPack, assEgi, assDesc
					, compCode, compDesc);
				
				// connect the fp to the assembly
				addOrUpdateConnection(assEl, fpElement, "", "Aggregation", "Forms");
				
				// mod count is a flag that indicates if we have some modifier details to deal with.
				if (modCount > 0) {
					addModifierEnumToFunctionalPos(fpElement, assEgi, compCode);
				}
				
				addCompsToFunctionalPos(fpElement, assEgi, compCode);
			}
			
			forEachRecordCall(dbconn, sqlGetFunctionalPos, createFunctionalPositions, assEgi);
		}
		
		
		// ## ASSEMBLIES
		// for each of the initial records we use this callback to create the assemblies and their hierarchies
		var createAssemblies = function(rsHierarchy) {
		
			var prntEgi = STRTrim(rsHierarchy.Fields.Item('prntegi').Value);
			var prntDesc = STRTrim(rsHierarchy.Fields.Item('prntdesc').Value);
			var parentElement = checkHashOrExecute(assHash, prntEgi, prntDesc, function(name) {
				return addGetAssemblyByName(assemblyPack, prntEgi, prntDesc, name);
			});
			
				
			var chldEgi = STRTrim(rsHierarchy.Fields.Item('chldegi').Value);
			var chldDesc = STRTrim(rsHierarchy.Fields.Item('chlddesc').Value);
			var childElement = checkHashOrExecute(assHash, chldEgi, chldDesc, function(name) {
				var elmt =  addGetAssemblyByName(assemblyPack, chldEgi, chldDesc, name);
				
				addFunctionalPosToAss(elmt, chldEgi, chldDesc);
				return elmt;
			});
				
			// connect the parent to the child
			addOrUpdateConnection(parentElement, childElement, "", "Aggregation", "Forms");
		}
		
		// this is the first call - start with the assemblies
		forEachRecordCall(dbconn, sqlGetAssemblies, createAssemblies, null);	
	}
	return;
}



// creates an enumeration instance and assignes it to a class attribues
function getAndAssignEnum(package, subpackName, parentElmt, name, elementAttName) {
	var attSType = "Intrinsic Asset Attribute";
	
	// todo - this probably already exists perhaps we could pass it in?
	var subPackage as EA.Package;
	subPackage = getPackageFromPath(package, subpackName, true);
	
	var enumEl as EA.Element;
	// (packageObj, type, name, stereoType, description, alias)
	enumEl = createOrObtainElement(subPackage, "Enumeration", name, "Enumeration", name, name);
	
	var attributeAtt as EA.Attribute;
	// parameters - parent, name, stereoType, description, attrType, attrVal
	attributeAtt = createOrObtainAttribute(parentElmt, elementAttName, attSType, "", name, "" );
	
	return enumEl;
}

function addEnumValueToType(enumElement, enumName, enumDesc) {
	var attributeAtt as EA.Attribute;
	var enumValue = enumDesc + ' ('+enumName+')';
	// parameters - parent, name, stereoType, description, attrType, attrVal
	attributeAtt = createOrObtainAttribute(enumElement, enumValue, "Enumeration", enumValue, "", "" );
}


// intended to take an assembly EGI and using it first check the taxonomy to see if it exists
// if it does return a reference to it - if it doesn't check for the parents and create them
// then create the connections between the parents and add the child
// the name hash is a list of objects that can be checked to see if this object has already been added to shortcut
// the process
function addGetAssemblyByName(assemblyPackage, assemblyEgi, assemblyDesc, className) {
	var strAssGrp = "Assembly Group";
	var strAssTyp = "Assembly Type";
		
	// Get a name for an assembly group and if it doesn't exist create the sub package
	// currently this is fairly basic just removes the middle letter from the EGI code if it's a number
	// and replaces it with a '?'
	var groupName = assemblyEgi.replace(/[0-9]/g, "?");
	
	var subPackage as EA.Package;
	subPackage = getPackageFromPath(assemblyPackage, groupName, true);
	
	var group as EA.Element;
	group = createOrObtainElement(subPackage, "Class"
		, groupName + " ASSEMBLY", strAssGrp
		, "The assembly group for " + groupName, groupName);
	
	var assType as EA.Element;
	assType = createOrObtainElement(subPackage, "Class"
		, className, strAssTyp, assemblyDesc, assemblyEgi);
	
	addOrUpdateConnection(group, assType, "", "Generalization", "Catalogues");
	
	return assType;
}

// if a functional pos exists it will retreive it and if it doesn't it adds it to EA as well as creating a hierarchical
// structure for it.
function addGetFunctionalPositionByName(package, assEgi, assDesc, compCode, compDesc) {
	var strGrp = "Functional Position Group";
	var strTyp = "Functional Position";
		
	// Get a name for an fp group and if it doesn't exist create the sub package
	var subPackage as EA.Package;
	subPackage = getPackageFromPath(package, compCode, true);
	
	var group as EA.Element;
	group = createOrObtainElement(subPackage, "Class"
		, compDesc + " ("+compCode+")", strGrp
		, compDesc, compCode);
	
	var fpType as EA.Element;
	fpType = createOrObtainElement(subPackage, "Class"
		, compDesc + " ("+assEgi+" - "+compCode+")"
		, strTyp , assDesc+" - "+assEgi, assEgi+" - "+compCode);
	
	addOrUpdateConnection(group, fpType, "", "Generalization", "Catalogues");
	
	return fpType;
}

//if a component exists it will retreive it and if it doesn't it adds it to EA as well as creating a hierarchical
// structure for it.
function addGetComponentByName(package, componentEgi, componentDesc, className) {
	var strGCompGrp = "Generic Component Group";
	var strCompGrp = "Component Group";
	var strCompTyp = "Component Type";
		
	var groupName = componentEgi.substring(0, 3);
	var genGroupName = componentEgi.substring(0, 1) + "#" + componentEgi.substring(2, 3);
	
	var subPackage as EA.Package;
	subPackage = getPackageFromPath(package, genGroupName, true);
	
	var genericGroup as EA.Element;
	genericGroup = createOrObtainElement(subPackage, "Class"
		, genGroupName, strGCompGrp
		, genGroupName + ". Generic component group that exists as a parent for all related component types."
		, genGroupName);
	
	var group as EA.Element;
	group = createOrObtainElement(subPackage, "Class"
		, groupName, strCompGrp
		, groupName + ". The component group that exists as a parent for all related component types."
		, groupName);
	
	addOrUpdateConnection(genericGroup, group, "", "Generalization", "Catalogues");
	
	var compType as EA.Element;
	compType = createOrObtainElement(subPackage, "Class"
		, className, strCompTyp, componentDesc, componentEgi);
	
	addOrUpdateConnection(group, compType, "", "Generalization", "Catalogues");
	
	return compType;
}


/*
 * Project Browser Script main function
 */
function OnProjectBrowserScript()
{
	// Get the type of element selected in the Project Browser
	var treeSelectedType = Repository.GetTreeSelectedItemType();
	
	
	// Handling Code: Uncomment any types you wish this script to support
	// NOTE: You can toggle comments on multiple lines that are currently
	// selected with [CTRL]+[SHIFT]+[C].
	switch ( treeSelectedType )
	{
		case otPackage :
		{
			try {
				executeCreate();
				
				Session.Prompt( "Ellipse Model Generation Complete.", promptOK );
			}
			catch(obj)
			{
				// Error message
				Session.Prompt( obj, promptOK );
			}
			break;
		}
		default:
		{
			// Error message
			Session.Prompt( "This script does not support items of this type.", promptOK );
		}
	}
}

OnProjectBrowserScript();
