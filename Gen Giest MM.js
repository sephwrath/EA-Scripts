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
	var assemblyFolder = "Maintenance Assemblies";
	var assetFolder = "Asset Types";
	var assetUseFolder = "Asset Uses";
	var attributionFolder = "Nameplate Attributes";
	var maintReqFolder = "Maintenance Requirements";
	
	var assemblyCompDgrFolder = "Diagrams - Assembly Composition";
	var assetAttribDgrFolder = "Diagrams - Asset Type Attribution";
	var maintReqDgrFolder = "Diagrams - Maintenance Requirements";
	
	// create a set of hash tables to cache elements that we have 
	// already dealt with and avoid doing more work than necessary
	var npaHash = {};
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
	dbconn.Open("DSN=MS Access Database;Uid=;Pwd=;");
	if (dbconn == 0) throw "Unable to open connection to the ellipse database";
	
	//newModel = getPackageFromPath(Repository.Models.GetAt(0), rootPath);
	if ( newModel != null && newModel.ParentID != 0 )
	{		
		
		// loop through all of the Assemblies go into the folder create a diagram for the folder name
		var assemblyPack = getPackageFromPath(newModel, assemblyFolder, true);
		var assetUsePack = getPackageFromPath(newModel, assetUseFolder, true);
		var assetPack = getPackageFromPath(newModel, assetFolder, true);
		var attributionPack = getPackageFromPath(newModel, attributionFolder, true);
		var maintReqPack = getPackageFromPath(newModel, maintReqFolder, true);
		
		var assemblyCompDgrPack = getPackageFromPath(newModel, assemblyCompDgrFolder, true);
		var assetAttribDgrPack = getPackageFromPath(newModel, assetAttribDgrFolder, true);
		var maintReqDgrPack = getPackageFromPath(newModel, maintReqDgrFolder, true);
		
			
		var sqlGetAssemblies = "SELECT S.Id as ID, S.EGI AS EGI, S.Description AS Description " +
			" , S.PlantId AS PlantId FROM MaintSystem AS S ORDER BY s.EGI;";
		
		var sqlGetAssAssets = "SELECT C.Id as ID, C.EGI AS EGI, C.Description AS Component, C.DisciplineId AS Discipline, " +
			"SC.DescriptionFormat AS Format, SC.PlantId AS PlantID, RC.Comment AS Comment " +
			"FROM (SystemComponent AS SC LEFT JOIN ReviewComment AS RC " +
			"ON (SC.MaintComponentId = RC.ComponentId) AND (SC.MaintSystemId = RC.SystemId)) " +
			"LEFT JOIN MaintComponent AS C ON SC.MaintComponentId = C.Id "+
			"WHERE SC.MaintSystemId = ? ORDER BY c.EGI;";
				
		var sqlGetAssetAttrib = "SELECT N.Description AS NPA, N.[Values] AS [Values], N.Units AS Units " +
			", CN.CaptureOnSite AS COS, RC.Comment AS Comment " +
			"FROM (ComponentNPA AS CN LEFT JOIN ReviewComment AS RC ON (CN.MaintComponentId = RC.ComponentId) " +
			"AND (CN.MaintNPAId = RC.NPAId)) LEFT JOIN MaintNPA AS N ON CN.MaintNPAId = N.Id " +
			"WHERE CN.MaintComponentId = ? ORDER BY N.Description;";
				
		var sqlGetAssMaint = "SELECT M.TaskNum AS TaskNumber, M.Description AS MSR, M.Frequency AS Frequency " +
			", P.Description AS Policy, M.ScopeOfTask AS Scope " +
			"FROM MSR AS M LEFT JOIN PolicyInfo AS P ON M.PolicyRefId = P.Id " +
			"WHERE M.SystemId = ? and M.ComponentId is null ORDER BY M.TaskNum;";
			
		var sqlGetAblyMaint = "SELECT M.TaskNum AS TaskNumber, M.Description AS MSR, M.Frequency AS Frequency " +
			", P.Description AS Policy, M.ScopeOfTask AS Scope " +
			"FROM MSR AS M LEFT JOIN PolicyInfo AS P ON M.PolicyRefId = P.Id " +
			"WHERE M.SystemId = ? and M.ComponentId = ? ORDER BY M.TaskNum;";
				
		
		// 	##MAINTENANCE SCHEDULED REQUIREMENTS
		// 	selects the MSRS for a given assembly
		var addMSRsToAssembly = function(id, assElmt, sqlSmt, msrDgrm) {
						
			var createMSR = function(rsMSR) {
				var tNum = rsMSR.Fields.Item('TaskNumber').Value;
				var msr = rsMSR.Fields.Item('MSR').Value;
				var freq = rsMSR.Fields.Item('Frequency').Value;
				var policy = rsMSR.Fields.Item('Policy').Value;
				var scope = rsMSR.Fields.Item('Scope').Value;
				
				var strMSRTyp = "Scheduled Work";
					
				var desc = tNum + ' - ' + msr;
				var note = desc;
				if (policy) note += " Policy:  " + policy + ". ";
				if (scope) note += scope;
					
				var msrType as EA.Element;
				msrType = createOrObtainElement(maintReqPack, "Class"
					, desc, strMSRTyp, note , desc);
					
				var msrAtt as EA.Attribute;
				if (freq) {
					msrAtt = createOrObtainAttribute(msrType, "Frequency", strMSRTyp
						, "", "String", freq);
				}
				
				if (policy) {
					msrAtt = createOrObtainAttribute(msrType, "Policy", strMSRTyp
						, "", "String", policy);
				}
				
				addClassToDiagram(msrDgrm, msrType);
					
				addOrUpdateConnection( msrType, assElmt, "", "Generalization", "Attributes");
			}
			
			forEachRecordCall(dbconn, sqlSmt, createMSR, id);
		}		
			
			
		// 	##INFORMATION ITEMS
		// 	selects the attributes for a given EGI from the database and adds them
		var addAttributesToElement = function(element, id, assetDgrm) {
						
			var createAttribute = function(rsAttribute) {
				var npa = rsAttribute.Fields.Item('NPA').Value;
				var values = rsAttribute.Fields.Item('Values').Value;
				var units = rsAttribute.Fields.Item('Units').Value;
				var captOnSite = rsAttribute.Fields.Item('COS').Value;
				var comment = rsAttribute.Fields.Item('Comment').Value;
				
				var attribElement = checkHashOrExecute(npaHash, npa, "", function(name) {
					var strIntrinsicTyp = "Intrinsic Asset Attribute";
					
					var note = npa;
					if (captOnSite) note += " Capture on site:  " + captOnSite + ". ";
					if (comment) note += comment;
						
					var attributeType as EA.Element;
					attributeType = createOrObtainElement(attributionPack, "Class"
						, npa, strIntrinsicTyp, note , npa);
					
					var attributeAtt as EA.Attribute;
					if (values) {
						attributeAtt = createOrObtainAttribute(attributeType, "Value", "Intrinsic Asset Attribute"
							, "", "String", values);
					}
					
					if (units) {
						attributeAtt = createOrObtainAttribute(attributeType, "Unit", "Intrinsic Asset Attribute"
							, "", "String", units);
					}
					return attributeType;
				});
					
				addClassToDiagram(assetDgrm, attribElement);
					
				addOrUpdateConnection( attribElement, element, "", "Generalization", "Attributes");
			}
			
			forEachRecordCall(dbconn, sqlGetAssetAttrib, createAttribute, id);
		}		
			
		
		
		// ## add assets and the asset use connected to it.
		// this call back is used to create the functional positions for each assembly
		var addAssetToAssembly = function(id, assElmt, assDesc, assEgi, assemblyDgrm) {

			var createAssetAndUse = function(rsAsset) {
				var assetId = rsAsset.Fields.Item('ID').Value;
				var assetEgi = rsAsset.Fields.Item('EGI').Value;
				var assetDesc = rsAsset.Fields.Item('Component').Value;
				var assetDisc = rsAsset.Fields.Item('Discipline').Value;
				var useFmt = rsAsset.Fields.Item('Format').Value;
				var usePlantId = rsAsset.Fields.Item('PlantID').Value;
				var assetComment = rsAsset.Fields.Item('Comment').Value;
				
				// within the assembly Hash check add the asset so that we only do it once
				var assetElement = checkHashOrExecute(attHash, assetEgi, assetDesc, function(name) {
					var strCompTyp = "Component Type";
					
					var note = assetDesc;
					if (assetEgi) note += " (" + assetEgi + "). ";
					if (assetDisc) note += " Belongs to the " + assetDisc + " category. ";
					if (assetComment) note += assetComment;
						
					var assetType as EA.Element;
					assetType = createOrObtainElement(assetPack, "Class"
						, assetDesc, strCompTyp, note , assetEgi);
					
					var assetDgrm as EA.Diagram;
					assetDgrm = createOrObtainDiagram(assetDesc, assetAttribDgrPack);
					addClassToDiagram(assetDgrm, assetType);
				
					addAttributesToElement(assetType, assetId, assetDgrm);
					
					return assetType;
				});
				
				// add the asset use and connect all the components
				var note = assetDesc;
				if (useFmt) note += " used for " + useFmt + ". ";
				if (usePlantId) note += " Plant instance format " + usePlantId + ". ";
					
				var strAssetUseTyp = "Asset Type Use";
					
				var assetUse as EA.Element;
				assetUse = createOrObtainElement(assetUsePack, "Class"
						, assDesc + " - " + assetDesc, strAssetUseTyp, note , assEgi + " - " + assetEgi);
					
				addOrUpdateConnection(assElmt, assetUse, "", "Aggregation", "Forms");
				
				addOrUpdateConnection(assetUse, assetElement, "", "Association", "Implements");
				
				addClassToDiagram(assemblyDgrm, assetUse);
				addClassToDiagram(assemblyDgrm, assetElement);
				
				var param = new Array();
				param.push(id);
				param.push(assetId);
				addMSRsToAssembly(param, assetUse, sqlGetAblyMaint, assemblyDgrm);
			}
			
			forEachRecordCall(dbconn, sqlGetAssAssets, createAssetAndUse, id);
		}
		
		
		// ## ASSEMBLIES
		// for each of the initial records we use this callback to create the assemblies and their hierarchies
		var createAssemblies = function(rsHierarchy) {
			var id = rsHierarchy.Fields.Item('ID').Value;
			var egi = rsHierarchy.Fields.Item('EGI').Value;
			var desc = rsHierarchy.Fields.Item('Description').Value;
			var plantId = rsHierarchy.Fields.Item('PlantId').Value;
			
			var strAssTyp = "Assembly Type";
			
			var note = desc;
			if (egi) note += " (" + egi + ").";
			if (plantId) note += " Has a plant descriptor of format " + plantId + ".";
			
			var assType as EA.Element;
			assType = createOrObtainElement(assemblyPack, "Class"
				, desc, strAssTyp, note , egi);
			
			var assemblyDgrm as EA.Diagram;
			assemblyDgrm = createOrObtainDiagram(desc, assemblyCompDgrPack);
			addClassToDiagram(assemblyDgrm, assType);
			
			var msrDgrm as EA.Diagram;
			msrDgrm = createOrObtainDiagram(desc, maintReqDgrPack);
			addClassToDiagram(msrDgrm, assType);
			
			addAssetToAssembly(id, assType, desc, egi, assemblyDgrm);
			
			addMSRsToAssembly(id, assType, sqlGetAssMaint, msrDgrm);
		}
		
		// this is the first call - start with the assemblies
		forEachRecordCall(dbconn, sqlGetAssemblies, createAssemblies, null);	
	}
	return;
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
				
				Session.Prompt( "Model Generation Complete.", promptOK );
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
