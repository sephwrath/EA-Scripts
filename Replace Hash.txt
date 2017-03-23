!INC Local Scripts.EAConstants-JScript
!INC AIS Common.AIS Common

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
 
 function replaceInNames(packageObj, oldStr, newStr)
{
    var dgrm as EA.Diagram;
	var elmt as EA.Element;
	var subPackage as EA.Package;
	subPackage = packageObj;
    var styleStr;

	if (subPackage.Name.indexOf(oldStr) != -1) {
			subPackage.Name = subPackage.Name.replace(oldStr, newStr, "gi");
	}
    
    // go through each diagram and check the element objects etc to make sure they are formatted correctly
	for (var j = 0; j < subPackage.Diagrams.Count; j++)
	{
		dgrm = subPackage.Diagrams.GetAt(j);
		if (dgrm.Name.indexOf(oldStr) != -1) {
			dgrm.Name = dgrm.Name.replace(oldStr, newStr, "gi");
			dgrm.Update();
		}
    }
	for (var j = 0; j < subPackage.Elements.Count; j++)
	{
		elmt = subPackage.Elements.GetAt(j);
		if (elmt.Name.indexOf(oldStr) != -1) {
			elmt.Name = elmt.Name.replace(oldStr, newStr, "gi");
			elmt.Notes = elmt.Notes.replace(oldStr, newStr, "gi");
			elmt.Update();
		}
	}
    
    // recurse through children
	for (var j = 0; j < subPackage.Packages.Count; j++)
	{
        replaceInNames(subPackage.Packages.GetAt(j), oldStr, newStr);
    }
	subPackage.Update();
	return;
}


 function addAttribute(packageObj, attName, attVal, stype)
{
	var attrib as EA.Attribute;
	var elmt as EA.Element;
	var subPackage as EA.Package;
	subPackage = packageObj;
    var styleStr;
 
	for (var j = 0; j < subPackage.Elements.Count; j++)
	{
		elmt = subPackage.Elements.GetAt(j);
		if (elmt.Stereotype == "Component Type") {
			
			attrib = null;
			for (var k = 0; k < elmt.Attributes.Count; k++)
			{
				if (elmt.Attributes.GetAt(k).Name == attName) {
					attrib = elmt.Attributes.GetAt(k);
					break;
				}
			}
			if (attrib == null) {
				attrib = elmt.Attributes.AddNew(attName, "Attribute");
			}
			attrib.Stereotype = stype;
			attrib.Default = attVal;
			attrib.Update();
			elmt.Attributes.Refresh();
		}
	}
    
    // recurse through children
	for (var j = 0; j < subPackage.Packages.Count; j++)
	{
        addAttribute(subPackage.Packages.GetAt(j), attName, attVal, stype);
    }
	subPackage.Update();
	return;
}

function changeConnectionDirection(model)
{
	var conn as EA.Connector;
	var elmt as EA.Element;
	var subPackage as EA.Package;
	subPackage = model;
    var swap;
 
	for (var j = 0; j < subPackage.Elements.Count; j++)
	{
		elmt = subPackage.Elements.GetAt(j);
		if (elmt.Stereotype == "Component Type" || elmt.Stereotype ==  "Assembly Type") {
			
			for (var k = 0; k < elmt.Connectors.Count; k++)
			{
				conn = elmt.Connectors.GetAt(k);
				if (conn.SupplierID == elmt.ElementID && conn.Stereotype == "Attributes" && conn.Type == "Generalization") {
					swap = conn.ClientID;
					conn.ClientID = conn.SupplierID;
					conn.SupplierID = swap;
					conn.Update();
				}
			}
		}
	}
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
				var newModel as EA.Package;
				newModel = Repository.GetTreeSelectedPackage();
				//replaceInNames(newModel, "#", "?");
				addAttribute(newModel, "Discipline", "ELEC", "Metadata");
				
				//changeConnectionDirection(newModel);
				
				// connect to an ODB database
				//var dbconn = new ActiveXObject("ADODB.Connection");
				
				Session.Prompt( "Finished string replacement.", promptOK );
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
