!INC Local Scripts.EAConstants-JScript


function forEachRecordCall(dbconn, sql, callback, parameterArray) {
	var command = new ActiveXObject("ADODB.Command");
	var recordSet = new ActiveXObject("ADODB.Recordset");
	var SQLAuthor2, strMessage, strMessage2;
	var Err, ErrCount;
	
	try {
		command.CommandText = sql;
		
		command.ActiveConnection = dbconn;
		
		if (parameterArray) {
			var rowsAffected;
			var param = parameterArray;
			if (parameterArray.constructor !== Array) {
				param = new Array();
				param.push(parameterArray);
			}
			recordSet = command.Execute(rowsAffected, param );
		}
		else {
			recordSet = command.Execute();
		}
		
		//recordSet.MoveFirst();
		while(!recordSet.EOF) {
			callback(recordSet);
			
			recordSet.MoveNext();
		}
		
	}
	catch(problem) {
		Session.Prompt( "Looping through the recordset " + problem.message, promptOK );
	}
	
}
