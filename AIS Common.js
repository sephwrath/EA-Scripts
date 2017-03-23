!INC Local Scripts.EAConstants-JScript
!INC EAScriptLib.JScript-String


function getPackageFromPath(sourcePackage, path, createPckg)
{
	var retVal = null;
    
    var pathArr = path.toString().split("/");
    var pathPart;
    
    try{
		var packageList as EA.Collection;
		packageList = sourcePackage.Packages;
		
		var currentPackage as EA.Package;
		for(var i = 0; i < pathArr.length; i++)
		{
			pathPart = STRTrim(pathArr[i]);
			try {
				currentPackage = packageList.GetByName(pathPart);
				if (currentPackage == null && createPckg) {
					currentPackage = packageList.AddNew(pathPart, "Package");
					currentPackage.Update();
					packageList.Refresh();
				}
			}
			catch( obj) {
				if ( createPckg) {
					currentPackage = packageList.AddNew(pathPart, "Package");
					currentPackage.Update();
					packageList.Refresh();
				}
			}
			packageList = currentPackage.Packages;
		}
		retVal = currentPackage;
    }
    catch( obj) {
		Repository.EnsureOutputVisible( "Script" );

		Session.Output( obj );
	}
	return retVal;
}

function addClassToDiagram(diagram, classObj)
{
	var dgrm as EA.Diagram;
	dgrm = diagram;
	
	var updateMade = false;
	var diagramObj as EA.DiagramObject;

	for (var i = 0; i < dgrm.DiagramObjects.Count; i++)
	{
		diagramObj = dgrm.DiagramObjects.GetAt(i);
		//Class1.Connectors.Delete (i)
		if (diagramObj.ElementID == classObj.ElementID) {
			// just incase delete any duplicates here
			if (updateMade) dgrm.DiagramObjects.DeleteAt(i, false);
			else {
				updateMade = true;
			}
		}
	}

	if (updateMade == false) {
		diagramObj = dgrm.DiagramObjects.AddNew("", "");
		diagramObj.ElementID = classObj.ElementID;
		diagramObj.Update();
		dgrm.Update();
	}
	return diagramObj;
}

function addOrUpdateConnection(class1, class2, aName, connType, stereotype)
{
	var tempConn as EA.Connector;
	var retVal as EA.Connector;
	var updateMade;
	updateMade = false;

	for (var i = 0;  i < class2.Connectors.Count - 1; i++) {
		tempConn = class2.Connectors.GetAt(i);
		//Class1.Connectors.Delete (i)
		if ((tempConn.SupplierID == class1.ElementID) && tempConn.Type == connType) {
			if (updateMade){
				class2.Connectors.Delete(i);
			} else {
				tempConn.SupplierID = class1.ElementID;
				tempConn.stereotype = stereotype;
				tempConn.Update();
				updateMade = true;
				retVal = tempConn;
			}
		}
	}

	if (!updateMade) {
		tempConn = class2.Connectors.AddNew(aName, connType);
		tempConn.SupplierID = class1.ElementID;
		tempConn.stereotype = stereotype;
		tempConn.Update();
        
		retVal = tempConn;
	}
	return retVal;
}

// obtains a diagram with the given name or when the diagram doesn't exist it creates a new one.
function createOrObtainDiagram(diagramName, packageObj)
{
	var diagram as EA.Diagram;
	var subPackage as EA.Package;
	subPackage = packageObj;
	
	try{
		diagram = subPackage.Diagrams.GetByName(diagramName);
		if (diagram == null) {
			diagram = subPackage.Diagrams.AddNew(diagramName, "Diagram");
			diagram.Update();
		} 
	}
	catch(obj) {
		diagram = subPackage.Diagrams.AddNew(diagramName, "Diagram");
		diagram.Update();
	}
	return diagram;
}

// add any classes related to the specific class to the diagaram if they match the given stereoType string.
function addRelatedClassesByStereoType(diagram, classObj, stereoType)
{
	var addFunction = function(passedClass) {
		addClassToDiagram(diagram, passedClass);
	}
	forEachConnectionExecute(classObj, stereoType, addFunction, false);
	return diagram;
}

//


// add all of the classes contained in the passed package to the diagram 
// if stereoType is not empty/null it is used to filter out the packages that dont match
function addClassesContainedInPackage(diagram, pkg, stereoType)
{
	for(var j = 0; j < pkg.Elements.Count; j++)
	{
		var newElement as EA.Element;
		newElement = pkg.Elements.GetAt(j);
		if (stereoType == null || streoType == "" || newElement.Stereotype == stereoType) {
			addClassToDiagram(diagram, newElement);
		}
	}
	return diagram;
}

// for each of the items connected to the class that match the stereotype execute the passed function
// parent is a boolean and indicates if the funtion should be run on the parent class as well.
function forEachConnectionExecute(classObj, stereoType, exFunc, parent)
{
	var newClass as EA.Element;
	var connector as EA.Connector;
	for(var k = 0; k < classObj.Connectors.Count; k++)
	{
		connector = classObj.Connectors.GetAt(k);
		if (connector.Stereotype == stereoType)
		{
			if (classObj.ElementID == connector.ClientID) {
				newClass = Repository.GetElementByID(connector.SupplierID);
			} else {
				newClass = Repository.GetElementByID(connector.ClientID);
			}
			exFunc(newClass);
		}
	}
	if (parent) {
		exFunc(parent);
	}
	return classObj;
}

// for each of the items connected to the class that match the stereotype execute the passed function
// parent is a boolean and indicates if the funtion should be run on the parent class as well.
function forEachClassInPackageExecute(package, stereoType, exFunc, aggregatedVariable)
{
	var element as EA.Element;
	var rootPack as EA.Package;
	rootPack = package;
	
	for(var k = 0; k < rootPack.Elements.Count; k++)
	{
		element = rootPack.Elements.GetAt(k);
		if (element.Stereotype == stereoType)
		{
			aggregatedVariable = exFunc(element, rootPack, aggregatedVariable);
		}
	}
	return aggregatedVariable;
}

// test for the existance of the given stereoType
function doesConnectionTypeExist(classObj, stereoType) {
	var trueCount = false;
	var connector as EA.Connector;
	for(var k = 0; k < classObj.Connectors.Count; k++)
	{
		connector = classObj.Connectors.GetAt(k);
		if (connector.Stereotype == stereoType)
		{
			trueCount = true;
		}
	}
	return trueCount;
}


// obtains an element from the package with the given name otherwise it generates the element.
function createOrObtainElement(packageObj, type, name, stereoType, description, alias)
{
	var element as EA.Element;
	var subPackage as EA.Package;
	subPackage = packageObj;
	
	try{
		// blerch - turns out the behaviour for not finding an element is different depending 
		// on whether the collection is empty - *FACEPALM* empty = ret null: not empty throw
		try {
			element = subPackage.Elements.GetByName(name);
		}
		catch (obj) {
			element = null;
		}
		if (element == null) {
			element = subPackage.Elements.AddNew(name, type);
		} 
		element.Stereotype = stereoType;
		element.Notes = description;
		element.Alias = alias;
		
		element.Update();
		subPackage.Elements.Refresh();
	}
	catch(obj) {
		throw "Error creating element " + name + ". Error: " + obj.Message;
	}
	return element;
}

// obtains an element from the package with the given name otherwise it generates the element.
function createOrObtainAttribute(parent, name, stereoType, description, attrType, attrVal) {
	var myAttribute as EA.Attribute;
	var prntClass as EA.Element;
	prntClass = parent;
	
	// try to find attribute with the name
	try{
		// blerch - turns out the behaviour for not finding an element is different depending 
		// on whether the collection is empty - *FACEPALM* empty = ret null: not empty throw
		try {
			myAttribute = null;
			var testAtt as EA.Attribute;
			for(var k = 0; k < prntClass.Attributes.Count; k++)
			{
				testAtt = prntClass.Attributes.GetAt(k);
				if (testAtt.Name == name)
				{
					myAttribute = testAtt;
					break;
				}
			}
		}
		catch (obj) {
			myAttribute = null;
		}
		
		if (myAttribute == null) {
			myAttribute = prntClass.Attributes.AddNew(name, "Attribute");
		} 
		myAttribute.Stereotype = stereoType;
		myAttribute.Notes = description;
		myAttribute.Type = attrType;
		myAttribute.Default = attrVal;
		
		myAttribute.Update();
	}
	catch(obj) {
		throw "Error creating attribute " + name + ". Error: " + obj.Message;
	}
	return myAttribute;
}








