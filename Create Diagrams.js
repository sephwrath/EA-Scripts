!INC Local Scripts.EAConstants-JScript
!INC EAScriptLib.JScript-String
!INC AIS Common.AIS Common



/*
 * Script Name: 
 * Author: 
 * Purpose: 
 * Date: 
 */
 
function executeCreate()
{
	var assemblyFolder = "Assemblies";
	var cataloguesFolder = "Component Catalogues";

	// Create a new model node
	var newModel as EA.Package;
	newModel = Repository.GetTreeSelectedPackage();
	//newModel = getPackageFromPath(Repository.Models.GetAt(0), rootPath);
	
	if ( newModel != null && newModel.ParentID != 0 )
	{		
		// loop through all of the Assemblies go into the folder create a diagram for the folder name
		var assemblyPack = getPackageFromPath(newModel, assemblyFolder, false);
		if (assemblyPack == null) throw "Package must contain a " + assemblyFolder + " package.";
			
		
		var subPackage as EA.Package;
		var diagram as EA.Diagram;
		
		for(var i = 0; i < assemblyPack.Packages.Count; i++)
		{
			subPackage = assemblyPack.Packages.GetAt(i);
			
			// create the diagram that contains all of the assembly hierarchies.
			diagram = createOrObtainDiagram("Catalogue - " + subPackage.Name, subPackage);
			addClassesContainedInPackage(diagram, subPackage, null);
			
			// for each element in the package go through and depending on sterio type create a diagram
			for(var j = 0; j < subPackage.Elements.Count; j++)
			{
				var testElement as EA.Element;
				var newDiagram as EA.Diagram;
				testElement = subPackage.Elements.GetAt(j);
				if (testElement.Stereotype == "Assembly Type") {
					newDiagram = createOrObtainDiagram("Assembly - " + testElement.Name, subPackage);				
					addClassToDiagram(newDiagram, testElement);
					addRelatedClassesByStereoType(newDiagram, testElement, "Forms");
					
					// create a function pointer and use it to set up a call to add Forms Classes to each 
					var newFunction = function(classObj) {
						addRelatedClassesByStereoType(newDiagram, classObj, "Implements");
					}
					forEachConnectionExecute(testElement, "Forms", newFunction);
				}
				
			}
			assemblyPack.Packages.Refresh();
			
			// add an attribution diagram for each of the classes
			for(var m = 0; m < subPackage.Elements.Count; m++)
			{
				var attElement as EA.Element;
				attElement = subPackage.Elements.GetAt(m);
				
				if (doesConnectionTypeExist(attElement, "Attributes")) {
					var attDiagram as EA.Diagram;
					attDiagram = createOrObtainDiagram("Attributed - " + attElement.Name, subPackage);
						
					addClassToDiagram(attDiagram, attElement);
					
					var attFunction = function(attClass) {
						
						addClassToDiagram(attDiagram, attClass);
					}
					forEachConnectionExecute(attElement, "Attributes", attFunction, false);
				}
			}
			assemblyPack.Packages.Refresh();
		}
		
		// loop through all of the Catalogues go into the folder create a diagram for the folder name
		assemblyPack = getPackageFromPath(newModel, cataloguesFolder, false);
		if (assemblyPack == null) throw "Package must contain a " + cataloguesFolder + " package.";
			
		
		for(var i = 0; i < assemblyPack.Packages.Count; i++)
		{
			subPackage = assemblyPack.Packages.GetAt(i);
			
			// create the diagram that contains all of the assembly hierarchies.
			diagram = createOrObtainDiagram("Catalogue - " + subPackage.Name, subPackage);
			addClassesContainedInPackage(diagram, subPackage, null);
			
			assemblyPack.Packages.Refresh();
			
			// create an attribution diagram for each of the classes
			for(var m = 0; m < subPackage.Elements.Count; m++)
			{
				var attElement as EA.Element;
				attElement = subPackage.Elements.GetAt(m);
				
				if (doesConnectionTypeExist(attElement, "Attributes")) {
					var attDiagram as EA.Diagram;
					attDiagram = createOrObtainDiagram("Attributed - " + attElement.Name, subPackage);
						
					addClassToDiagram(attDiagram, attElement);
					
					var attFunction = function(attClass) {
						
						addClassToDiagram(attDiagram, attClass);
					}
					forEachConnectionExecute(attElement, "Attributes", attFunction, false);
				}
			}
			assemblyPack.Packages.Refresh();
		}
	}
	else
	{
		Session.Prompt( "This script requires a package to be selected in the Project Browser.\n" +
			"Please select a package in the Project Browser and try again.", promptOK );
	}
}
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
