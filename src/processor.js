const fs = require('fs')
const csvToJson = require('csvtojson');
const Enumerable = require('linq');

// TODO: this should be received as input, along with the file
const maxTotalLunchHours = 1;
const weekHours = 40;

// const processFile = (fileName) => {
//     return csvToJson().fromFile(fileName)
//     .then(jsonData => {
//         return doProcess(jsonData);
//     }).catch(err => {
//         // log error if any
//         console.log(err);
//     });
// };

const processFile = async (fileName) => {
    try{
        const jsonData = await csvToJson().fromFile(fileName);
        const result = doProcess(jsonData);
        return result;
    }catch(err){
        console.log(err);
        return Promise.reject(err);
    }
 }

const doProcess = (jsonData) => {
    let grouped = Enumerable
        .from(jsonData)
        .where((element) => { 
            return element.ActivityNumber != '000';
        })
        .groupBy((element) => ({
                StartDate: element.StartDate,
                externalid_employee: element.externalid_employee,
                emp_id: element.emp_id,
                externalid_project: element.externalid_project,
                ActivityNumber: element.ActivityNumber
            }),
            (element) => parseFloat(element.RegularVal),
            (key, values) => ({
                StartDate: key.StartDate,
                externalid_employee: key.externalid_employee,
                emp_id: key.emp_id,
                externalid_project: key.externalid_project,
                ActivityNumber: key.ActivityNumber,
                SumRegularVal: values.sum()
            })
        )
        .toArray();

    let lineItems = [];

    grouped.forEach((groupedElement) => {
        let totalDays = Enumerable
            .from(jsonData)
            .where((element) => { 
                return element.emp_id == groupedElement.emp_id;
            })
            .sum((element) => {
                return parseFloat(element.RegularVal)

            });

        let lineItem = {
            "StartDate": groupedElement.StartDate,
            "externalid_employee": groupedElement.externalid_employee,
            "emp_id": groupedElement.emp_id,
            "externalid_project": groupedElement.externalid_project,
            "ActivityNumber": groupedElement.ActivityNumber,
            "RegularVal": groupedElement.SumRegularVal,
            "totalDays": parseFloat(totalDays),
            "day": 0
        };

        let projectCode = Enumerable
        .from(jsonData)
        .where((element) => { 
            return (
                element.StartDate == groupedElement.StartDate &&
                element.emp_id == groupedElement.emp_id &&
                element.ActivityNumber != '000'
            );
        })
        .select((element) => {
            return {externalid_project: element.externalid_project, ActivityNumber: element.ActivityNumber}
        })
        .first();

        let dayTotal = Enumerable
        .from(jsonData)
        .where((element) => { 
            return (
                element.StartDate == groupedElement.StartDate &&
                element.emp_id == groupedElement.emp_id &&
                element.ActivityNumber != '000'
            );
        })
        .sum((element) => {
            return parseFloat(element.RegularVal)
        });

        if (groupedElement.externalid_project == projectCode.externalid_project && groupedElement.ActivityNumber == projectCode.ActivityNumber) {
            if (dayTotal >= maxTotalLunchHours) {
                let lunchValue = Enumerable
                .from(jsonData)
                .where((element) => { 
                    return (
                        element.StartDate == groupedElement.StartDate &&
                        element.emp_id == groupedElement.emp_id &&
                        element.ActivityNumber == '000'
                    );
                })
                .sum((element) => {
                    return parseFloat(element.RegularVal)
                });

                lineItem.day = parseFloat(groupedElement.SumRegularVal) + parseFloat(lunchValue);
            } else {
                lineItem.day = groupedElement.SumRegularVal;
            }
        } else {
            lineItem.day = groupedElement.SumRegularVal;
        }

        lineItems.push(lineItem);
    });

    //****** Start exporting ******

    let stringLines = '';
    let emp = '';
    let totalValue = 0;

    lineItems.forEach((line) => {
        // let d = new Date(line.StartDate);
        // TODO: why do this? we already have this data slash separated
        // let arrstartdate = line.StartDate.split('-');
        // let startdate = arrstartdate[1] + '/' + arrstartdate[2] + '/' + arrstartdate[0].substring(2);

        let startdate = line.StartDate
        totalValue = 0;

        if (emp != line.externalid_employee) {
            let str = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',1,' + Number(line.day).toFixed(2) + ',,';
            totalValue = totalValue + line.day;
            stringLines = stringLines + str + '\n';
        } else {
            if (totalValue < weekHours) {
                totalValue = totalValue + line.day;

                if (totalValue > weekHours) {
                    let diffTotal = totalValue - weekHours;

                    if (diffTotal <= line.day) {
                        valor1 = line.day - diffTotal;
                        valor2 = line.day - valor1;

                        let str1 = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',1,' + Number(valor1).toFixed(2) + ',,';
                        stringLines = stringLines + str1 + '\n';

                        let str2 = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',2,' + Number(valor2).toFixed(2) + ',,';
                        stringLines = stringLines + str2 + '\n';
                    } else {
                        let str = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',2,' + Number(line.day).toFixed(2) + ',,';
                        stringLines = stringLines + str + '\n';
                    }

                } else {
                    let str = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',1,' + Number(line.day).toFixed(2) + ',,';
                    stringLines = stringLines + str + '\n';
                }

            } else {
                let str = startdate + ',' + line.externalid_employee + ',' + line.externalid_project + ',' + line.ActivityNumber + ',2,' + Number(line.day).toFixed(2) + ',,';
                stringLines = stringLines + str + '\n';
                totalValue = totalValue + line.day;
            }
        }

        emp = line.externalid_employee;
    });


    return stringLines;
}

exports.processFile = processFile;
