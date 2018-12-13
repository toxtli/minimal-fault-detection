/*
 * MULTIPLE FAULTS DETECTION
 * By Carlos Toxtli ( @ctoxtli )
 * http://www.carlostoxtli.com
 */

/*
 * PARAMS
 */

var hasUI = true;

/*
 * TESTS
 */

function test() {
	var eq = "w'y' + y'z + wxz + xyz'";
	//var eq = "wz' + xy' + w'x + wx'y";
	//var eq = "A'B' + B'C'D + ABCD";
	//var eq = "BC + B'C'D + ABE + A'BD'E'";
	//var eq = "(A+B+D'+E)(A'+D'+E')(B'+C+D)(C'+D')";
	//var eq = "(w + x')(x' + z')(w' + y + z')";
	var faults = getFaults(eq);
	console.log('A-TEST', faults[0]);
	console.log('B-TEST', faults[1]);
}

/*
 * CORE
 */

function getFaults(eq) {
	var isSOP = (eq.indexOf('(') == -1);
	var varsTable = getVariablesTable(eq);
	var varsDict = getVariablesDict(varsTable);
	var numVars = varsTable.length;
	var emptyTable = createTable(numVars);
	var eqBlocks = getBlocks(eq, varsDict, numVars, isSOP);
	var populatedTable = populateTable(emptyTable, eqBlocks);
	var faultsA = calcFaultsA(eqBlocks);
	var faultsADec = convertToDecimal(faultsA);
	var faultsB = calcFaultsB(eqBlocks, populatedTable, numVars);
	var reduced = reduceFaultB(faultsB);
	var reducedFaultsB = reduced[0];
	var reducedReport = reduced[1];
	var reducedFaultsBDec = convertToDecimal(reducedFaultsB);
	var extra = [isSOP, varsTable, varsDict, numVars, emptyTable, eqBlocks,
		populatedTable, faultsA, faultsB, reducedFaultsB, eq, reducedReport];
	if (isSOP)
		return [faultsADec, reducedFaultsBDec, extra, faultsA, reducedFaultsB];
	return [reducedFaultsBDec, faultsADec, extra, reducedFaultsB, faultsA];
}

function getUniqueElements(faults) {
	var elements = [];
	for (var fault of faults) {
		if (fault.length == 1) {
			elements.push(fault[0]);
		}
	}
	return elements;
}

function reduceSimilar(uniques, faults) {
	var report = []
	for (var unique of uniques) {
		var toDelete = [];
		for (var i in faults) {
			var fault = faults[i];
			if (fault.length > 1) {
				if (fault.indexOf(unique) != -1) {
					toDelete.push(i);
					report.push([unique, i, cloneObject(fault)]);
				}
			}
		}
		while (toDelete.length > 0) {
			var index = toDelete.pop();
			faults.splice(index, 1);
		}
	}
	return [faults, report];
}

function getOptions(faults) {
	var uniques = [];
	var combinations = [];
	var indices = [];
	for (var i in faults) {
		var faultArr = faults[i];
		for (var fault of faultArr) {
			if (fault.length == 1) {	
				uniques.push(fault);
			} else {
				combinations.push(fault);
				indices.push(i);
			}
		}
	}
	return [uniques, combinations, indices];
}

function getElements(combinations) {
	var dict = {};
	for (var combination of combinations) {
		for (var element of combination) {
			dict[element] = true
		}
	}
	return Object.keys(dict);
}

function recursiveCommon(combinations, arrUnique, report, indices) {
	var occurrences = [];
	var positions = [];
	var elements = getElements(combinations);
	for (var i in elements) {
		var element = elements[i];
		occurrences[i] = 0;
		positions[i] = [];
		for (var j in combinations) {
			var combination = combinations[j];
			if (combination.indexOf(element) != -1) {
				occurrences[i]++;
				positions[i].push(j);
			}
		}
	}
	var maxOcurrence = Math.max.apply(Math, occurrences)
	if (maxOcurrence > 1) {
		var maxIndex = occurrences.indexOf(maxOcurrence);
		var maxElement = elements[maxIndex];
		arrUnique.push([maxElement]);
		// console.log(positions[maxIndex]);
		// if (positions[maxIndex].indexOf(maxIndex+'') == -1) {
		// 	positions[maxIndex].push(maxIndex+'');
		// 	positions[maxIndex].sort();
		// }
		// console.log(positions[maxIndex]);
		// console.log(combinations);

		while (positions[maxIndex].length > 0) {
			var index = positions[maxIndex].pop();
			//console.log(combinations, index);
			report.push([maxElement, indices[index], cloneObject(combinations[index])]);
			combinations.splice(index, 1);
		}
		if (combinations.length > 1) {
			return recursiveCommon(combinations, arrUnique, report, indices);
		} else {
			return [arrUnique, combinations, report];
		}
	} else {
		return [arrUnique, combinations, report];
	}
}

function reduceCommon(faults) {
	var report = [];
	var cloned = cloneObject(faults);
	var arrOptions = getOptions(cloned);
	var result = [];
	var unique = arrOptions[0];
	result = result.concat(unique);
	var combinations = arrOptions[1];
	if (combinations.length > 0) {
		var arrElements = recursiveCommon(combinations, [], [], arrOptions[2]);
		result = result.concat(arrElements[0]);
		result = result.concat(arrElements[1]);
		report = arrElements[2];
	}
	result = removeDuplicates(result);
	return [result, report];
}

function removeDuplicates(array) {
	var hash = {};
	var out = [];
	for (var i = 0, l = array.length; i < l; i++) {
		var key = array[i].join('|');
		if (!hash[key]) {
			out.push(array[i]);
			hash[key] = true;
		}
	}
	return out
}

function reduceFaultB(faults) {
	var newFaults = cloneObject(faults);
	var report = [];
	for (var i = 0; i < newFaults.length - 1; i++) {
		var fromFault = newFaults[i];
		for (var j = i + 1; j < newFaults.length; j++) {
			var toFault = newFaults[j];
			var uniqueFrom = getUniqueElements(fromFault);
			var uniqueTo = getUniqueElements(toFault);
			var reducedI = reduceSimilar(uniqueTo, fromFault);
			var reducedJ = reduceSimilar(uniqueFrom, toFault);
			newFaults[i] = reducedI[0];
			newFaults[j] = reducedJ[0];
			report = report.concat(reducedI[1]);
			report = report.concat(reducedJ[1]);
		}
	}
	var common = reduceCommon(newFaults);
	var unique = common[0];
	report = report.concat(common[1]);
	return [unique, report];
}

function calcFaultsA(eqBlocks) {
	var faults = [];
	for (var i in eqBlocks) {
		var curBlock = eqBlocks[i];
		var repeated = [];
		for (var j in eqBlocks) {
			if (i != j) {
				var newBlock = eqBlocks[j];
				for (var k of curBlock) {
					for (var l of newBlock) {
						if (k == l) {
							repeated.push(k);
						}
					}
				}
			}
		}
		var diff = curBlock.filter(function(n) {return repeated.indexOf(n) < 0;});
		faults.push(diff);
	}
	return faults;
}

function calculateNeighbors(blocks, numVars) {
	var neighbors = [];
	for (var i = 0; i < numVars; i++) {
		var isValid = true;
		var arrPos = [];
		for (var block of blocks) {
			var newBlock = block.split('');
			newBlock[i] = newBlock[i] == '0' ? '1' : '0';
			newBlock = newBlock.join('');
			arrPos.push(newBlock);
			if (blocks.indexOf(newBlock) != -1) {
				isValid = false;
			}
		}
		if (isValid) {
			neighbors.push(arrPos);
		}
	}
	return neighbors;
}

function calcFaultsB(eqBlocks, table, numVars) {
	var faults = [];
	for (var i in eqBlocks) {
		var curBlock = eqBlocks[i];
		var neighbors = calculateNeighbors(curBlock, numVars);
		var arrFaults = [];
		for (var arrNeighbor of neighbors) {
			var arrFault = [];
			for (var neighbor of arrNeighbor) {
				if (table[neighbor] == null) {
					arrFault.push(neighbor);
				}
			}
			arrFaults.push(arrFault);
		}
		faults.push(arrFaults);
	}
	return faults;
}

function populateTable(table, blocks) {
	for (var arr of blocks) {
		for (var block of arr) {
			table[block] = 1;
		}
	}
	return table;
}

function getBlocks(eq, varsDict, numVars, isSOP) {
	var vars = [];
	var blocks = [];
	var eq = eq + ' ';
	var varSet = ''.padStart(numVars, "d").split('');
	var newVar = true;
	var i = 0;
	if (isSOP) {
		while (i < eq.length) {
			var chr = eq[i]
			if (chr != ' ' && chr != '+') {
				newVar = true;
				var position = varsDict[chr];
				if ((i + 1) < eq.length) {
					if (eq[i + 1] == "'") {
						varSet[position] = '0';
						i++;
					} else {
						varSet[position] = '1';
					}
				}
			} else {
				if (newVar) {
					vars.push(varSet.join(''));
					varSet = ''.padStart(numVars, "d").split('');
					newVar = false;
				}
			}
			i++;	
		}
	} else {
		while (i < eq.length) {
			var chr = eq[i]
			if (chr == '(') {
				newVar = true;
			} else if (chr == ')') {
				if (newVar) {
					vars.push(varSet.join(''));
					varSet = ''.padStart(numVars, "d").split('');
					newVar = false;
				}
			} else if (chr != ' ' && chr != '+' && chr != '*') {
				newVar = true;
				var position = varsDict[chr];
				if ((i + 1) < eq.length) {
					if (eq[i + 1] == "'") {
						varSet[position] = '1';
						i++;
					} else {
						varSet[position] = '0';
					}
				}
			}
			i++;	
		}
	}
	for (var i in vars) {
		var cur = vars[i];
		if (cur.indexOf('d') == -1) {
			blocks.push([cur])
		} else {
			var elements = [];
			var positions = [];
			cur.replace(/(d)/g, function (a, b, index) {
			    positions.push(index);
			});
			var numCares = positions.length;
			var numElements = Math.pow(2, numCares);
			var keys = [];
			for (var j = 0; j < numElements; j++) {
				var key = j.toString(2).padStart(numCares, "0");
				keys.push(key);
			}
			for (var j in keys) {
				var arrKeys = keys[j].split('');
				var newArr = cur.split('');
				for (var k in arrKeys) {
					newArr[positions[k]] = arrKeys[k];
				}
				elements.push(newArr.join(''));
			}
			blocks.push(elements)
		}
	}
	return blocks;
}

function getVariablesDict(varsTable) {
	var output = {};
	for (var i in varsTable) {
		output[varsTable[i]] = i;
	}
	return output;
}

function createTable(numVars) {
	var table = {};
	var numElements = Math.pow(2, numVars);
	for (var i = 0; i < numElements; i++) {
		var key = i.toString(2).padStart(numVars, "0");
		table[key] = null;
	}
	return table;
}

function getVariablesTable(eq) {
	var variables = {};
	var tokens = [" ", "+", "'", "(", ")", "*", ".", ","];
	for (var chr of eq) {
		if (tokens.indexOf(chr) == -1) {
			variables[chr] = 0;
		}
	}
	variables = Object.keys(variables).sort();
	return variables;
}

function convertToDecimal(array) {
	var cloned = cloneObject(array);
	for (var i in cloned) {
		for (var j in cloned[i]) {
			if (typeof cloned[i][j] == 'object') {
				for (var k in cloned[i][j]) {
					cloned[i][j][k] = parseInt(cloned[i][j][k], 2);
				}
			} else {
				cloned[i][j] = parseInt(cloned[i][j], 2);
			}
		}
	}
	return cloned;
}

function cloneObject(obj) {
	return JSON.parse(JSON.stringify(obj));
}

/*
 * USER INTERFACE
 */

var globTableA, globTableB, globTableAll;

function showFaults(eq) {
	showAndHideContent();
	var results = getFaults(eq);
	var fault0 = results[0];
	var fault1 = results[1];
	var faults0 = results[3];
	var faults1 = results[4];
	var metadata = results[2];
	var isSOP = metadata[0];
	var varsDict = metadata[2];
	var numVars = metadata[3];
	var eqBlocks = metadata[5];
	var populatedTable = metadata[6];	
	var faultsBAll = metadata[8];
	var eq = metadata[10];
	var report = metadata[11];
	var tableCode = getTable('TBL', numVars, populatedTable, isSOP, eqBlocks);
	if (isSOP) {
		var faultA = fault0;
		var faultB = fault1;
		var faultsA = faults0;
		var faultsB = faults1;
	} else {
		var faultA = fault1;
		var faultB = fault0;
		var faultsA = faults1;
		var faultsB = faults0;
	}
	setLabels(isSOP, eq);
	showVarsDict(varsDict);
	showBlocks(tableCode, eqBlocks);
	showStepsA(tableCode, eqBlocks, faultsA);
	showResults('resultA', faultA);
	showTableA(tableCode, eqBlocks, faultsA);
	showStepsB(tableCode, eqBlocks, faultsBAll);
	showReductions(faultsBAll, report);
	showResults('resultB', faultB);
	showTableB(tableCode, eqBlocks, faultsB);
	showResults('resultAll', faultA.concat(faultB));
	showTableAll(tableCode, eqBlocks, faultsA.concat(faultsB));
}

function showStepsA(tableCode, blocks, faults) {
	var textOutput = '';
	var tableName = 'stA';
	var blocksDec = convertToDecimal(blocks);
	var faultsDec = convertToDecimal(faults);
	for (var i in blocksDec) {
		var block = blocksDec[i];
		var fault = faultsDec[i];
		var tableId = tableName + i;
		textOutput += '<br>For the test: ' + JSON.stringify(block);
		textOutput += '<br>The test points are: ' + JSON.stringify(fault);
		var tableStep = setTableName(tableId, tableCode);
		textOutput += tableStep;
	}
	document.getElementById('testAStep1').innerHTML = textOutput;
	for (var i in blocks) {
		var tableId = tableName + i;
		setColors(tableId, blocks, '#CCCCCC');
		setColors(tableId, [blocks[i]], '#0000FF');
		setColors(tableId, [faults[i]], '#FF0000');
	}
}

function showStepsB(tableCode, blocks, faults) {
	var textOutput = '';
	var tableName = 'stB';
	var blocksDec = convertToDecimal(blocks);
	var faultsDec = convertToDecimal(faults);
	for (var i in blocksDec) {
		var block = blocksDec[i];
		var fault = faultsDec[i];
		var tableId = tableName + i;
		textOutput += '<br>For the test: ' + JSON.stringify(block);
		textOutput += '<br>The test points are: ' + JSON.stringify(fault);
		var tableStep = setTableName(tableId, tableCode);
		textOutput += tableStep;
	}
	document.getElementById('testBStep1').innerHTML = textOutput;
	for (var i in faults) {
		var tableId = tableName + i;
		setColors(tableId, blocks, '#CCCCCC');
		setColors(tableId, [blocks[i]], '#0000FF');
		setColors(tableId, faults[i], false);
	}
}

function showReductions(faultsBAll, report) {
	var textOutput = '';
	var faultsDec = convertToDecimal(faultsBAll);
	textOutput += '<br>The faults detected on each block are: <br><br>';
	for (var i in faultsDec) {
		textOutput += '<b>' + (parseInt(i) + 1) + '</b>: ';
		textOutput += JSON.stringify(faultsDec[i]);
		textOutput += '<br>';
	}
	textOutput += '<br>The order in which the faults are being covered is the following: <br>';
	for (var i in report) {
		textOutput += '<br>The fault <b>' + parseInt(report[i][0], 2) + '</b> covers the group <b>';
		textOutput += JSON.stringify(convertToDecimal([report[i][2]]));
		textOutput += '</b> from block <b>' + (parseInt(report[i][1]) + 1) + '</b>';
	}
	document.getElementById('testBStep2').innerHTML = textOutput;
}

function setLabels(isSOP, eq) {
	if (!isSOP) {
		document.getElementById('testNameA').textContent = 'B-TEST';
		document.getElementById('testNameB').textContent = 'A-TEST';
	}
	document.getElementById('equation').textContent = eq;
}

function setTableName(name, code) {
	return code.split('TBL').join(name);
}

function showAndHideContent() {
	document.getElementById('content').hidden = false;
	var hideDetails = true;
	if (document.getElementById('stepByStep').checked) {
		hideDetails = false;
	}
	var elements = document.querySelectorAll('.detailed');
	for (var element of elements) {
		element.hidden = hideDetails;
	}
}

function showResults(where, faults) {
	var faultText = '';
	var coma1 = '';
	for (var fault of faults) {
		faultText += coma1 + '( ';
		var coma2 = '';
		for (var element of fault) {
			faultText += coma2 + '<b>' + element + '</b>';
			coma2 = ' or ';
		}
		faultText += ' )'
		coma1 = ' and ';
	}
	document.getElementById(where).innerHTML = faultText;
}

function showVarsDict(varsDict) {
	document.getElementById('varsDict').innerHTML = '<b>' + Object.keys(varsDict).join('</b> <b>') + '</b>';
}

function getTable(prefix, numVars, populatedTable, isSOP, eqBlocks) {
	var rows = parseInt(numVars / 2);
	var cols = rows + (numVars % 2);
	var rowsNum = Math.pow(2, rows);
	var colsNum = Math.pow(2, cols);
	var numElements = Math.pow(2, numVars);
	console.log(rows, cols, rowsNum, colsNum, numElements);
	var table = [];
	var refs = {};
	for (var i = 0; i < rowsNum; i++) {
		table[i] = [];
		for (var j = 0; j < colsNum; j++) {
			var rowCode = toGrayCode(i, rows);
			var colCode = toGrayCode(j, cols);
			var cellCode =  colCode + rowCode;
			var number = parseInt(cellCode, 2)
			table[i][j] = [];
			refs[cellCode] = table[i][j];
			var value = populatedTable[cellCode] == null ? '' : (isSOP ? 1 : 0)
			refs[cellCode].push(number);
			refs[cellCode].push(value);
			refs[cellCode].push(cellCode);
		}
	}
	var code = '<table border=1><thead><tr><th></th>';
	for (var j = 0; j < colsNum; j++) {
		code += '<th>' + toGrayCode(j, cols) + '</th>';
	}
	code += '</tr></thead><tbody>'
	for (var i = 0; i < rowsNum; i++) {
		code += '<tr><td><b>' + toGrayCode(i, rows) + '</b></td>';
		for (var j = 0; j < colsNum; j++) {
			var cellCode = table[i][j][2];
			var extra = '';
			code += '<td ' + extra + ' id="' + prefix + '_' + cellCode + '"><sub>' + table[i][j][0] + '</sub> ' + table[i][j][1] + '</td>';
		}
		code += '</tr>';
	}
	code += '</tbody></table>';
	return code;
}

function setColors(prefix, eqBlocks, staticColor, colors) {
	if (typeof colors == 'undefined') {
		colors = {};
	}
	for (var blockArr of eqBlocks) {
		var color = staticColor;
		if (!color) {
			color = hexToRgba(Colors.next(), 0.66);
		}
		for (var item of blockArr) {
			if (!colors.hasOwnProperty(item)) {
				colors[item] = [color];
			} else {
				colors[item].push(color);
			}
		}
	}
	for (var cellCode in colors) {
		var cell = document.getElementById(prefix + '_' + cellCode);
		var numColors = colors[cellCode].length;
		var extra = '';
		if (numColors == 1) {
			extra = colors[cellCode];
		} else {
			var stepSize = 100 / numColors;
			var pos = 0;
			var coma = '';
			extra = 'linear-gradient(to right, '
			for (var k = 0; k < numColors; k++) {
				extra += coma + ' ' + colors[cellCode][k] + ' ' + pos + '%, ' + colors[cellCode][k] + ' ' + (pos + stepSize) + '%';
				coma = ',';
				pos += stepSize;
			}
			extra += ')';
		}
		cell.style.background = extra;
	}
	return colors;
}

function hexToRgba(hex, alpha) {
	hex = hex.substr(1);
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    var rgba = "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    return rgba;
}

function toGrayCode(n, numVars) {
	return (n ^ (n >>> 1)).toString(2).padStart(numVars, "0");
}  

function showBlocks(tableCode, eqBlocks) {
	var tableName = 'tb1';
	tableCode = setTableName(tableName, tableCode);
	document.getElementById('blocks').innerHTML = tableCode;
	setColors(tableName, eqBlocks, false);
}



function showTableA(tableCode, eqBlocks, faults) {
	globTableA = [tableCode, eqBlocks, faults];
	var tableName = 'tb2';
	tableCode = setTableName(tableName, tableCode);
	document.getElementById('tableA').innerHTML = tableCode;
	var colors = setColors(tableName, eqBlocks, false);
	var combination = getRandomCombination(faults);
	setColors(tableName, combination, '#ff0000', colors);
}

function showTableB(tableCode, eqBlocks, faults) {
	globTableB = [tableCode, eqBlocks, faults];
	var tableName = 'tb3';
	tableCode = setTableName(tableName, tableCode);
	document.getElementById('tableB').innerHTML = tableCode;
	var colors = setColors(tableName, eqBlocks, false);
	var combination = getRandomCombination(faults);
	setColors(tableName, combination, '#ff0000', colors);
}

function showTableAll(tableCode, eqBlocks, faults) {
	globTableAll = [tableCode, eqBlocks, faults];
	var tableName = 'tb4';
	tableCode = setTableName(tableName, tableCode);
	document.getElementById('tableAll').innerHTML = tableCode;
	var colors = setColors(tableName, eqBlocks, false);
	var combination = getRandomCombination(faults);
	setColors(tableName, combination, '#ff0000', colors);
}

function generateTestA() {
	showTableA(globTableA[0], globTableA[1], globTableA[2]);
}

function generateTestB() {
	showTableB(globTableB[0], globTableB[1], globTableB[2]);
}

function generateTestAll() {
	showTableAll(globTableAll[0], globTableAll[1], globTableAll[2]);
}

function getRandomCombination(faults) {
	var combination = [];
	for (var fault of faults) {
		combination.push([fault[Math.floor(Math.random()*fault.length)]]);
	}
	return combination;
}

Colors = {
	pos: 0,
	names: {
	    aqua: "#00ffff",
	    blue: "#0000ff",
	    brown: "#a52a2a",
	    fuchsia: "#ff00ff",
	    gold: "#ffd700",
	    green: "#008000",
	    indigo: "#4b0082",
	    khaki: "#f0e68c",
	    lime: "#00ff00",
	    magenta: "#ff00ff",
	    maroon: "#800000",
	    navy: "#000080",
	    olive: "#808000",
	    orange: "#ffa500",
	    pink: "#ffc0cb",
	    purple: "#800080",
	    violet: "#800080",
	    red: "#ff0000",
	    silver: "#c0c0c0",
	    yellow: "#ffff00",
	    black: "#000000",
	    darkblue: "#00008b",
	    darkcyan: "#008b8b",
	    darkgrey: "#a9a9a9",
	    darkgreen: "#006400",
	    darkkhaki: "#bdb76b",
	    darkmagenta: "#8b008b",
	    darkolivegreen: "#556b2f",
	    darkorange: "#ff8c00",
	    darkorchid: "#9932cc",
	    darkred: "#8b0000",
	    darksalmon: "#e9967a",
	    darkviolet: "#9400d3"
	},
	random: function() {
	    var result;
	    var count = 0;
	    for (var prop in this.names)
	        if (Math.random() < 1/++count)
	           result = this.names[prop];
	    return result;
	},
	next: function() {
		var keys = Object.keys(this.names);
		if ((this.pos + 1) >= keys.length) {
			this.pos = 0;
		}
		return this.names[keys[this.pos++]];
	}
};

test();