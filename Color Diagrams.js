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
 */
 
 
function updatePackageStyles(packageObj, styleList)
{
    var dgrm as EA.Diagram;
	var subPackage as EA.Package;
	subPackage = packageObj;
    var styleStr;
    
    // go through each diagram and check the element objects etc to make sure they are formatted correctly
	for (var j = 0; j < subPackage.Diagrams.Count; j++)
	{
		dgrm = subPackage.Diagrams.GetAt(j);
        
        var diagramObj as EA.DiagramObject;
		for (var i = 0; i < dgrm.DiagramObjects.Count; i++)
		{
			diagramObj = dgrm.DiagramObjects.GetAt(i);
			
            var element as EA.Element;
			
            element = Repository.GetElementByID(diagramObj.ElementID);
			var stype = styleList[element.Stereotype];
			
			if (stype != null) {
				var bcol = parseInt(stype.color, 16);
				var lcol = parseInt(stype.border, 16);
				styleStr = "BCol=" + bcol + ";BFol=0;LCol=" + lcol + ";LWth=2;";
				if (stype.showInherited) {
					// this is undocumented but you can find out what happens if you change settings in EA and then debug to see what happened to the style
				   styleStr = styleStr + "AttCustom=0;OpCustom=0;AttInh=1;RzO=1;";
				}
				diagramObj.Style = styleStr;
				diagramObj.Update();
			}
        }
		dgrm.ShowDetails = 1;
		dgrm.Update();
    }
    
    // recurse through children
	for (var j = 0; j < subPackage.Packages.Count; j++)
	{
        updatePackageStyles(subPackage.Packages.GetAt(j), styleList);
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
	
	// the colors are reverse hex for some reason so BGR not RGB - to convert from standard RGB 
	// codes traspose the first two characteers with the last two
	var styleList = {
	"Condition Measure":{border: "55EEBB", color: "66FFCC", showInherited: false},
	"Assembly Group":{ border: "00006D", color: "3333FF", showInherited: false},
	"Assembly Type":{ border: "00006D", color: "3333FF", showInherited: false},	
	"Generic Component Group":{ border: "55EEEE", color: "33FFFF", showInherited: false},
	"Component Group":{ border: "55EEEE", color: "33FFFF", showInherited: false},
	"Component Type":{ border: "00BBEE", color: "00CCFF", showInherited: false},
	"Intrinsic Asset Attribute":{ border: "EEEEBB", color: "FFFFCC", showInherited: false},
	"Geospatial Route Section":{ border: "EE77AA", color: "FF99CC", showInherited: false},
	"Functional Position":{ border: "444444", color: "777777", showInherited: false}};
	
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
				updatePackageStyles(newModel, styleList);
				
				Session.Prompt( "Finished coloring.", promptOK );
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
