!INC Local Scripts.EAConstants-JScript

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name:
 * Author:
 * Purpose:
 * Date:
 
var lsDiagramDefault				= 0x00000000;
var lsProgramDefault				= 0xFFFFFFFF;

var lsCycleRemoveGreedy				= 0x80000000;
var lsCycleRemoveDFS				= 0x40000000;

var lsLayeringLongestPathSink		= 0x30000000;
var lsLayeringLongestPathSource		= 0x20000000;
var lsLayeringOptimalLinkLength		= 0x10000000;

var lsInitializeNaive				= 0x08000000;
var lsInitializeDFSOut				= 0x04000000;
var lsInitializeDFSIn				= 0x0C000000;

var lsCrossReduceAggressive			= 0x02000000;

var lsLayoutDirectionUp				= 0x00010000;
var lsLayoutDirectionDown			= 0x00020000;
var lsLayoutDirectionLeft			= 0x00040000;
var lsLayoutDirectionRight			= 0x00080000;
 */
 
 var projectInterface as EA.Project;
 
function updatePackageDiagramsLayout(interfaceObj, packageObj)
{
    var dgrm as EA.Diagram;
	var subPackage as EA.Package;
	subPackage = packageObj;
    var styleStr = lsDiagramDefault;
	
	styleStr |= (lsLayoutDirectionDown 
		| lsCrossReduceAggressive 
		| lsLayeringOptimalLinkLength
		| lsInitializeDFSOut
		| lsCycleRemoveDFS);
    
    // go through each diagram and check the element objects etc to make sure they are formatted correctly
	for (var j = 0; j < subPackage.Diagrams.Count; j++)
	{
		dgrm = subPackage.Diagrams.GetAt(j);
        projectInterface.LayoutDiagramEx (dgrm.DiagramGUID, styleStr, 4, 20, 20, true);
        dgrm.Update();
		Repository.CloseDiagram(dgrm.DiagramID);
    }
    
    // recurse through children
	for (var j = 0; j < subPackage.Packages.Count; j++)
	{
        updatePackageDiagramsLayout(interfaceObj, subPackage.Packages.GetAt(j));
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
				var newModel as EA.Package;
				newModel = Repository.GetTreeSelectedPackage();
				projectInterface = Repository.GetProjectInterface();
				updatePackageDiagramsLayout(projectInterface, newModel);
				Session.Prompt( "Finished laying out the diagrams.", promptOK );
			}
			catch(obj)
			{
				// Error message
				if(obj.description)
				{
					Session.Prompt( "Error - " + obj.description, promptOK );
				}
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

