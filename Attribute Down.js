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
 function attributeDown(packageObj)
 {
	var attrib as EA.Attribute;
	var elmt as EA.Element;
	var grpElmt as EA.Element;
	grpElmt = null;
	var subPackage as EA.Package;
	subPackage = packageObj;
    var styleStr;
	 
	var topLvlAttributeList = new Array();
	var secondLvlAttributeList = new Array();
 
	for (var j = 0; j < subPackage.Elements.Count; j++)
	{
		// if the element is a Generic Component Group save all of it's related connections
		// that are of attribute type attributes
		elmt = subPackage.Elements.GetAt(j);
		if (elmt.Stereotype == "Generic Component Group") {
			var attFunction = function(attClass) {
				topLvlAttributeList.push(attClass);
			}
			forEachConnectionExecute(elmt, "Attributes", attFunction, false);
			grpElmt = elmt;
			break;
		}
	}
	
	for (var k = 0; k < subPackage.Elements.Count; k++)
	{	
		// loop again and for each Component Group save all of the attributes that are of type attributes
		// get all component types for the component group and add each of the attributes for each list
		elmt = subPackage.Elements.GetAt(k);
		if (elmt.Stereotype == "Component Group" || elmt.Stereotype == "Assembly Group") {
			
			var att2Function = function(attClass) {
				secondLvlAttributeList.push(attClass);
			}
			forEachConnectionExecute(elmt, "Attributes", att2Function, false);
			
			
			var catalogueFunction = function(attClass) {
				if (attClass.Stereotype == "Component Type" || attClass.Stereotype == "Assembly Type")
				{
					for(var i = 0; i < topLvlAttributeList.length; i++)
					{
						addOrUpdateConnection(topLvlAttributeList[i], attClass, "", "Generalization", "Attributes");
					}
					
					for(var j = 0; j < secondLvlAttributeList.length; j++)
					{
						addOrUpdateConnection(secondLvlAttributeList[j], attClass, "", "Generalization", "Attributes");
						
					}
				}
			}
			
			forEachConnectionExecute(elmt, "Catalogues", catalogueFunction, false);
			
			var connector as EA.Connector;
			
			for(var c = 0; c < elmt.Connectors.Count; c++)
			{
				connector = elmt.Connectors.GetAt(c);
				if (connector.Stereotype == "Attributes") {
						elmt.Connectors.Delete(c);
				}
			}
			elmt.Connectors.Refresh();
			while(secondLvlAttributeList.length > 0) {
				secondLvlAttributeList.pop();
			}
		}
	}
	
	var groupConnector as EA.Connector;
	
	if (grpElmt != null)
	{
		for (var g = 0; g < grpElmt.Connectors.Count; g++) {
			groupConnector = grpElmt.Connectors.GetAt(g);
			if (groupConnector.Stereotype == "Attributes") {
				grpElmt.Connectors.Delete(g);
			}
		}
		grpElmt.Connectors.Refresh();
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
				attributeDown(newModel);
				
				Session.Prompt( "Done attributing.", promptOK );
				
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
