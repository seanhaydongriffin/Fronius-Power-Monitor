var settingsJsonObj;
var stdoutMap = new Map();

var currentPowerJsonObj;
var pastPowerJsonObj;

Neutralino.events.on('spawnedProcess', (evt) => {

    switch(evt.detail.action) {
        case 'stdOut':
            if (stdoutMap.has(evt.detail.id))
                stdoutMap.set(evt.detail.id, stdoutMap.get(evt.detail.id) + evt.detail.data);
            else
                stdoutMap.set(evt.detail.id, evt.detail.data);
            break;
        case 'stdErr':
            //console.log("stdErr=" + evt.detail.data);
            break;
        case 'exit':
            //console.log("exit evt.detail.id=" + evt.detail.id);
            var loadedJsonObj;

            try {
                loadedJsonObj = JSON.parse(stdoutMap.get(evt.detail.id));

                if (loadedJsonObj.hasOwnProperty("Body"))
                {
                    currentPowerJsonObj = loadedJsonObj;
                    handleCurrentPowerReply();
                } else
                {
                    document.querySelectorAll('td[data-name="cl1qty"]')[0].textContent = "0 kWh";
                    document.querySelectorAll('td[data-name="ssqty"]')[0].textContent = "0 kWh";
                    document.querySelectorAll('td[data-name="pqty"]')[0].textContent = "0 kWh";
                    document.querySelectorAll('td[data-name="cl1total"]')[0].textContent = "$0.00";
                    document.querySelectorAll('td[data-name="sstotal"]')[0].textContent = "$0.00";
                    document.querySelectorAll('td[data-name="ptotal"]')[0].textContent = "$0.00";

                    if (Array.isArray(loadedJsonObj) && loadedJsonObj[0].hasOwnProperty("con_direct"))
                    { 
                        console.log("handleSolarWebYearlyPastPowerReply");
                        pastPowerJsonObj = loadedJsonObj;
                        handleSolarWebYearlyPastPowerReply();
                    } else
                        if (loadedJsonObj.hasOwnProperty("isPremiumFeature"))
                        {
                            console.log("handleSolarWebPastPowerReply");
                            pastPowerJsonObj = loadedJsonObj;
                            handleSolarWebPastPowerReply();
                        } else {
                            console.log("handleInverterPastPowerReply");
                            pastPowerJsonObj = loadedJsonObj;
                            handleInverterPastPowerReply();
                        }
                }
            } catch (error) {
                loadedJsonObj = null;
                // solarWebEnhancedHistoricalChart.update('none');
                // document.querySelectorAll('td[data-name="cl1qty"]')[0].textContent = "0 kWh";
                // document.querySelectorAll('td[data-name="ssqty"]')[0].textContent = "0 kWh";
                // document.querySelectorAll('td[data-name="pqty"]')[0].textContent = "0 kWh";
                // document.querySelectorAll('td[data-name="cl1total"]')[0].textContent = "$0.00";
                // document.querySelectorAll('td[data-name="sstotal"]')[0].textContent = "$0.00";
                // document.querySelectorAll('td[data-name="ptotal"]')[0].textContent = "$0.00";
        
            }
            stdoutMap.delete(evt.detail.id);
            //alert(JSON.stringify(loadedJsonObj));
            document.getElementById('loading').textContent = '';

            break;
    }
});


function handleCurrentPowerReply()
{
    var d = new Date();
    var newLabel = d.toLocaleTimeString();
    
    var p_load = Math.abs(currentPowerJsonObj.Body.Data.Site.P_Load);
    var p_grid_from_grid = 0;
    var p_grid_to_grid = 0;
    
    if (currentPowerJsonObj.Body.Data.Site.P_Grid < 0)
        p_grid_to_grid = Math.abs(currentPowerJsonObj.Body.Data.Site.P_Grid);
    else
        p_grid_from_grid = Math.abs(currentPowerJsonObj.Body.Data.Site.P_Grid);
        
    var p_from_solar = p_load - p_grid_from_grid;

    addData(overTimeChart, newLabel, p_load, p_from_solar, p_grid_from_grid, p_grid_to_grid);
    addGaugeData(fromGridGauge, p_grid_from_grid);
    document.getElementById('powerFromGrid').textContent = Math.floor(p_grid_from_grid) + 'W';
    addGaugeData(fromSolarGauge, (p_from_solar + p_grid_to_grid));
    document.getElementById('powerFromSolar').textContent = Math.floor(p_from_solar + p_grid_to_grid) + 'W';
}


function tryUntilNoException(conditionFunc) {
    try {
        conditionFunc();
    } catch (err) {
        console.log('setTimeout');
        setTimeout(() => tryUntilNoException(conditionFunc), 100);
    }
}


function waitForTrue(conditionFunc) {
    try {
        if (conditionFunc()) {
            console.log('Condition met!');
        } else {
            console.log('setTimeout1');
            setTimeout(() => waitForTrue(conditionFunc), 100);
        }
    } catch (err) {
        console.log('setTimeout2');
        setTimeout(() => waitForTrue(conditionFunc), 100);
    }
}

function fillTimesArray(timesArray) {
    // Function to add minutes to a time string
    function addMinutes(time, minsToAdd) {
    const timeParts = time.split(':');
    const date = new Date();
    date.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);
    date.setMinutes(date.getMinutes() + minsToAdd);
    
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
    }
    
    // Get the last time from the array
    let lastTime = timesArray[timesArray.length - 1];
    
    // Continue adding times in 5-minute increments until 23:55
    while (lastTime !== '23:55') {
    lastTime = addMinutes(lastTime, 5);
    timesArray.push(lastTime);
    }

    return timesArray;
}


function sumPowerForPeriod(startHour, endHour, powerJsonObj)
{
    const today = document.getElementById('historicalChartDate').value;

    // Convert hours to Unix timestamps for the given day
    const startTime = new Date(today).setHours(startHour, 0, 0, 0);
    const endTime = new Date(today).setHours(endHour, 0, 0, 0);
    
    //console.log("startTime=" + startTime + ", endTime=" + endTime);

    // Sum the result values for the given range of hours
    return powerJsonObj.reduce((acc, obj) => {
        const keyTime = parseInt(obj.key);

        if (keyTime >= startTime && keyTime <= endTime) {
            //console.log("key=" + obj.key + ", result=" + obj.result);
            return acc + obj.result;
        }

        return acc;
    }, 0);

}




function adjustPowerForPeriod(powerJsonObj, startHour1, endHour1, startHour2, endHour2) {

    const today = document.getElementById('historicalChartDate').value;

    // Convert hours to Unix timestamps for the given day
    const startTime1 = new Date(today).setHours(startHour1, 0, 0, 0);
    const endTime1 = new Date(today).setHours(endHour1, 0, 0, 0);
    const startTime2 = new Date(today).setHours(startHour2, 0, 0, 0);
    const endTime2 = new Date(today).setHours(endHour2, 0, 0, 0);

    // Clone the original JSON object to avoid mutating it
    let modifiedJsonObj = JSON.parse(JSON.stringify(powerJsonObj));
    

    // Calculate the new values
    modifiedJsonObj.array = powerJsonObj.map(item => {
    let newItem = { ...item };
    if ((newItem.key >= startTime1 && newItem.key <= endTime1) || (newItem.key >= startTime2 && newItem.key <= endTime2)) {
    // Reduce the numeric value by 10%
    newItem.result *= 0.9;
    }
    return newItem;
    });
    
    // Create another array with the 10% values
    let tenPercentValuesArray = powerJsonObj.map(item => {
    let newItem = { ...item };
    if ((newItem.key >= startTime1 && newItem.key <= endTime1) || (newItem.key >= startTime2 && newItem.key <= endTime2)) {
        // Set the numeric value to 10% of the original
    newItem.result *= 0.1;
    } else {
    // If outside the time range, set the numeric value to 0
    newItem.result = 0;
    }
    return newItem;
    });
    
    return {
    modifiedArray: modifiedJsonObj.array,
    tenPercentValuesArray: tenPercentValuesArray
    };
}








function handleInverterPastPowerReply()
{
    solarWebEnhancedHistoricalChart.destroy();
    solarWebEnhancedHistoricalChart = new Chart(solarWebEnhancedHistoricalCanvas, inverterHistoricalConfig);
    solarWebEnhancedHistoricalChart.options.animation = false;
    const now = new Date(document.getElementById('historicalChartDate').value)
    const todayLong = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    solarWebEnhancedHistoricalChart.options.plugins.title = { display: true, text: `Power in 5 minute intervals as at ${todayLong}` };

    var localTimestamp = pastPowerJsonObj.map(item => item.local_timestamp.substring(11, 11+5));
    const consumptionIncrementalWatts = pastPowerJsonObj.map(item => item.consumption_incremental_watts == 0 ? null : item.consumption_incremental_watts);
    const gridProductionIncrementalWatts = pastPowerJsonObj.map(item => item.grid_production_incremental_watts == 0 ? null : item.grid_production_incremental_watts);
    const internalConsumptionIncrementalWatts = pastPowerJsonObj.map(item => item.internal_consumption_incremental_watts == 0 ? null : item.internal_consumption_incremental_watts);

    // add any available timestamps to the end of the day
    localTimestamp = fillTimesArray(localTimestamp);

    //console.log(JSON.stringify(localTimestamp));
    solarWebEnhancedHistoricalChart.data.labels = localTimestamp;
    solarWebEnhancedHistoricalChart.data.datasets[0].data = consumptionIncrementalWatts;            // the solar web blue line (consumption) 
    solarWebEnhancedHistoricalChart.data.datasets[1].data = gridProductionIncrementalWatts;         // the solar web gray area (Power to grid)
    solarWebEnhancedHistoricalChart.data.datasets[2].data = internalConsumptionIncrementalWatts;    // the solar web yellow area (consumed directly)
    solarWebEnhancedHistoricalChart.update('none');
    
}

function handleSolarWebYearlyPastPowerReply()
{
    solarWebEnhancedHistoricalChart.destroy();

    if (document.getElementById('views').value == 'powerDailyView')
    
        solarWebEnhancedHistoricalChart = new Chart(solarWebEnhancedHistoricalCanvas, solarWebYearlyEnhancedHistoricalConfig);

    if (document.getElementById('views').value == 'costDailyView')

        solarWebEnhancedHistoricalChart = new Chart(solarWebEnhancedHistoricalCanvas, solarWebYearlyCostHistoricalConfig);

    solarWebEnhancedHistoricalChart.options.animation = false;

    const dateArray = pastPowerJsonObj.map(item => item.date);
    solarWebEnhancedHistoricalChart.data.labels = dateArray;

    if (document.getElementById('views').value == 'powerDailyView')
    {
        const cl1Array = pastPowerJsonObj.map(item => item.cl1);
        const peakArray = pastPowerJsonObj.map(item => item.peak);
        const solarArray = pastPowerJsonObj.map(item => item.solar);
        const consumedDirectlyArray = pastPowerJsonObj.map(item => item.con_direct);
        solarWebEnhancedHistoricalChart.data.datasets[0].data = consumedDirectlyArray;
        solarWebEnhancedHistoricalChart.data.datasets[1].data = peakArray;
        solarWebEnhancedHistoricalChart.data.datasets[2].data = cl1Array;
        solarWebEnhancedHistoricalChart.data.datasets[3].data = solarArray;
    }

    if (document.getElementById('views').value == 'costDailyView')
    {
        const cl1Rate = document.getElementsByName('cfgcl1rate')[0].value;
        const dcRate = document.getElementsByName('cfgdcrate')[0].value;
        const dccl1Rate = document.getElementsByName('cfgdccl1rate')[0].value;
        const ssRate = document.getElementsByName('cfgssrate')[0].value;
        const pRate = document.getElementsByName('cfgprate')[0].value;
        const costWithSolarArray = pastPowerJsonObj.map(item => (item.cl1 * cl1Rate) + (1 * dcRate) + (1 * dccl1Rate) + (item.solar * ssRate) + (item.peak * pRate));
        const costWithoutSolarArray = pastPowerJsonObj.map(item => (item.cl1 * cl1Rate) + (1 * dcRate) + (1 * dccl1Rate) + ((item.peak + item.con_direct) * pRate));
        const maxCost = Math.ceil(Math.max(...costWithSolarArray, ...costWithoutSolarArray));

        solarWebEnhancedHistoricalChart.options.scales.y.max = maxCost;

        if (document.getElementById('withSolar').checked)

            solarWebEnhancedHistoricalChart.data.datasets[0].data = costWithSolarArray;

        if (document.getElementById('withoutSolar').checked)

            solarWebEnhancedHistoricalChart.data.datasets[0].data = costWithoutSolarArray;

        //solarWebEnhancedHistoricalChart.data.datasets[0].data = costArray;
    }

    solarWebEnhancedHistoricalChart.update('none');

}



function handleSolarWebPastPowerReply()
{

    solarWebEnhancedHistoricalChart.destroy();

    if (document.getElementById('views').value == 'powerIntradayV1View')

        solarWebEnhancedHistoricalChart = new Chart(solarWebEnhancedHistoricalCanvas, solarWebOriginalHistoricalConfig);
    
    if (document.getElementById('views').value == 'powerIntradayV2View')

        solarWebEnhancedHistoricalChart = new Chart(solarWebEnhancedHistoricalCanvas, solarWebEnhancedHistoricalConfig);

    solarWebEnhancedHistoricalChart.options.animation = false;
    const now = new Date(document.getElementById('historicalChartDate').value)
    const todayLong = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    solarWebEnhancedHistoricalChart.options.plugins.title = { display: true, text: `Power in 5 minute intervals as at ${todayLong}` };

    const powerToGridSeries = pastPowerJsonObj.settings.series.find(item => item.name === "Power to grid");
    const consumptionSeries = pastPowerJsonObj.settings.series.find(item => item.name === "Consumption");
    const consumedDirectlySeries = pastPowerJsonObj.settings.series.find(item => item.name === "Consumed directly");

    if (consumptionSeries)
    {
        //console.log("consumptionSeries=" + JSON.stringify(consumptionSeries));
        const consumptionTime = consumptionSeries.data.map(subArray => subArray[0]);
        const consumptionPower = consumptionSeries.data.map(subArray => subArray[1] == 0 ? null : subArray[1]);

        if (document.getElementById('views').value == 'powerIntradayV1View')

            solarWebEnhancedHistoricalChart.data.datasets[0].data = consumptionPower;

        console.log("consumptionPower=" + consumptionPower);
        //console.log("consumptionTime=" + JSON.stringify(consumptionTime));
        //console.log("consumptionPower=" + JSON.stringify(consumptionPower));


        var consumptionTimeHoursMinutes = consumptionTime.map(timestamp => {

            // Create a Date object from the Unix timestamp
            const date = new Date(timestamp); // Convert to milliseconds
            
            // Get hours and minutes
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            // Return the formatted time
            return `${hours}:${minutes}`;
        });


        consumptionTimeHoursMinutes = fillTimesArray(consumptionTimeHoursMinutes);


        //console.log("consumptionTimeHoursMinutes=" + JSON.stringify(consumptionTimeHoursMinutes));

        if (document.getElementById('views').value == 'powerIntradayV1View')

            solarWebEnhancedHistoricalChart.data.labels = consumptionTimeHoursMinutes;

        if (document.getElementById('views').value == 'powerIntradayV2View')

            solarWebEnhancedHistoricalChart.data.labels = consumptionTimeHoursMinutes;








        //const consumptionPower = consumptionSeries.data.map(subArray => subArray[1]);

        var consumedDirectlyPower;

        if (consumedDirectlySeries)

            consumedDirectlyPower = consumedDirectlySeries.data.map(subArray => subArray[1]);

        // subtract the direct consumption from the overall consumption to determine the consumption from the grid

        const consumedFromGridSeries = consumptionSeries.data.map(item => {

            var match;

            if (consumedDirectlySeries)
        
                match = consumedDirectlySeries.data.find(element => element[0] === item[0]);
            else

                match = [0,0];

            return match ? {
                key: item[0], result: item[1] - match[1]
            } : null;
        }).filter(item => item);

        console.log("consumedFromGridSeries=" + JSON.stringify(consumedFromGridSeries));

        const consumedFromGridPower = consumedFromGridSeries.map(subArray => subArray.result == 0 ? null : subArray.result);
        //console.log("consumedFromGridPower=" + JSON.stringify(consumedFromGridPower));

        const result = adjustPowerForPeriod(consumedFromGridSeries, 0, 7, 22, 24);
        console.log(result.modifiedArray); // This will log the array with reduced values
        console.log(result.tenPercentValuesArray); // This will log the array with 10% values
        const peakConsumedFromGridPower = result.modifiedArray.map(subArray => subArray.result == 0 ? null : subArray.result);
        console.log("peakConsumedFromGridPower=" + peakConsumedFromGridPower);

        if (document.getElementById('views').value == 'powerIntradayV2View')

            solarWebEnhancedHistoricalChart.data.datasets[1].data = peakConsumedFromGridPower;

        const cl1ConsumedFromGridPower = result.tenPercentValuesArray.map(subArray => subArray.result == 0 ? null : subArray.result);
        console.log("cl1ConsumedFromGridPower=" + cl1ConsumedFromGridPower);

        if (document.getElementById('views').value == 'powerIntradayV2View')

            solarWebEnhancedHistoricalChart.data.datasets[2].data = cl1ConsumedFromGridPower;
    




        // sum all the consumed from grid power (watts) for the entire day
        const consumedFromGridPowerTotalWatts = consumedFromGridPower.reduce((accumulator, currentValue) => { return accumulator + currentValue; }, 0);
        //console.log("consumedFromGridPowerTotalWatts=" + consumedFromGridPowerTotalWatts);
        





        // sum all the consumed from the grid power (watts) for the controlled load 1 period
        const morningControlledLoad1TotalWatts = sumPowerForPeriod(0, 7, consumedFromGridSeries);
        console.log("morningControlledLoad1TotalWatts=" + morningControlledLoad1TotalWatts);
        const eveningControlledLoad1TotalWatts = sumPowerForPeriod(22, 24, consumedFromGridSeries);
        console.log("eveningControlledLoad1TotalWatts=" + eveningControlledLoad1TotalWatts);
        const controlledLoad1TotalWatts = morningControlledLoad1TotalWatts + eveningControlledLoad1TotalWatts;
        console.log("controlledLoad1TotalWatts=" + controlledLoad1TotalWatts);

        // estimating 10% of the power during the controlled load 1 period applies to controlled load 1
        const controlledLoad1TotalWattsEstimated = controlledLoad1TotalWatts * 10 / 100;
        //console.log("controlledLoad1TotalWattsEstimated=" + controlledLoad1TotalWattsEstimated);
        const peakTotalWattsEstimated = consumedFromGridPowerTotalWatts - controlledLoad1TotalWattsEstimated;
        //console.log("peakTotalWattsEstimated=" + peakTotalWattsEstimated);

        // convert this into kWh
        const controlledLoad1TotalKilowattHoursEstimated = controlledLoad1TotalWattsEstimated * (5 / 60) / 1000;
        //console.log("controlledLoad1TotalKilowattHoursEstimated=" + controlledLoad1TotalKilowattHoursEstimated);
        const peakTotalKilowattHoursEstimated = peakTotalWattsEstimated * (5 / 60) / 1000;
        //console.log("peakTotalKilowattHoursEstimated=" + peakTotalKilowattHoursEstimated);

        console.log("cl1qty update");
        document.querySelectorAll('td[data-name="cl1qty"]')[0].textContent = controlledLoad1TotalKilowattHoursEstimated.toFixed(4) + " kWh";
        document.querySelectorAll('td[data-name="pqty"]')[0].textContent = peakTotalKilowattHoursEstimated.toFixed(4) + " kWh";
        
        const cl1Rate = document.getElementsByName('cfgcl1rate')[0].value;
        document.querySelectorAll('td[data-name="cl1total"]')[0].textContent = '$' + (controlledLoad1TotalKilowattHoursEstimated * cl1Rate).toFixed(2);
        const pRate = document.getElementsByName('cfgprate')[0].value;
        document.querySelectorAll('td[data-name="ptotal"]')[0].textContent = '$' + (peakTotalKilowattHoursEstimated * pRate).toFixed(2);

        const cl1MeterName = document.getElementsByName('cfgcl1meter')[0].value;
        //console.log("cl1MeterName=" + cl1MeterName);
        document.querySelectorAll('td[data-name="' + cl1MeterName + '-direction"]')[0].textContent = "\u25BC";
        document.querySelectorAll('td[data-name="' + cl1MeterName + '-direction"]')[0].style.color = "pink";
        document.querySelectorAll('td[data-name="' + cl1MeterName + '-usage"]')[0].textContent = controlledLoad1TotalKilowattHoursEstimated.toFixed(4) + " kWh";



        const pMeterName = document.getElementsByName('cfgpmeter')[0].value;
        //console.log("pMeterName=" + pMeterName);
        document.querySelectorAll('td[data-name="' + pMeterName + '-direction"]')[0].textContent = "\u25BC";
        document.querySelectorAll('td[data-name="' + pMeterName + '-direction"]')[0].style.color = "red";
        document.querySelectorAll('td[data-name="' + pMeterName + '-usage"]')[0].textContent = peakTotalKilowattHoursEstimated.toFixed(4) + " kWh";
        
    }

    if (consumedDirectlySeries)
    {
        //console.log("consumedDirectlySeries=" + JSON.stringify(consumedDirectlySeries));
        const consumedDirectlyPower = consumedDirectlySeries.data.map(subArray => subArray[1] == 0 ? null : subArray[1]);

        if (document.getElementById('views').value == 'powerIntradayV1View')

            solarWebEnhancedHistoricalChart.data.datasets[1].data = consumedDirectlyPower;

        if (document.getElementById('views').value == 'powerIntradayV2View')

            solarWebEnhancedHistoricalChart.data.datasets[0].data = consumedDirectlyPower;

        console.log("consumedDirectlyPower=" + consumedDirectlyPower);
    }

    if (powerToGridSeries)
    {    
        //console.log("powerToGridSeries=" + JSON.stringify(powerToGridSeries));
        const powerToGridPower = powerToGridSeries.data.map(subArray => subArray[1] == 0 ? null : subArray[1]);

        if (document.getElementById('views').value == 'powerIntradayV1View')

            solarWebEnhancedHistoricalChart.data.datasets[2].data = powerToGridPower;

        if (document.getElementById('views').value == 'powerIntradayV2View')
        
            solarWebEnhancedHistoricalChart.data.datasets[3].data = powerToGridPower;

        console.log("powerToGridPower=" + powerToGridPower);


        // sum all the power to the grid (watts) for the day
        const powerToGridPowerTotalWatts = powerToGridPower.reduce((accumulator, currentValue) => { return accumulator + currentValue; }, 0);

        // convert that into kWh
        const powerToGridPowerTotalKilowattHours = powerToGridPowerTotalWatts * (5 / 60) / 1000;
        //console.log("powerToGridPowerTotalKilowattHours=" + powerToGridPowerTotalKilowattHours);

        document.querySelectorAll('td[data-name="ssqty"]')[0].textContent = powerToGridPowerTotalKilowattHours.toFixed(4) + " kWh";

        const ssMeterName = document.getElementsByName('cfgssmeter')[0].value;
        //console.log("ssMeterName=" + ssMeterName);
        document.querySelectorAll('td[data-name="' + ssMeterName + '-direction"]')[0].textContent = "\u25B2";
        document.querySelectorAll('td[data-name="' + ssMeterName + '-direction"]')[0].style.color = "#999999";
        document.querySelectorAll('td[data-name="' + ssMeterName + '-usage"]')[0].textContent = powerToGridPowerTotalKilowattHours.toFixed(4) + " kWh";
        
        const ssRate = document.getElementsByName('cfgssrate')[0].value;
        document.querySelectorAll('td[data-name="sstotal"]')[0].textContent = '$' + Number(Math.abs(powerToGridPowerTotalKilowattHours * ssRate)).toFixed(2);

        if (Number(powerToGridPowerTotalKilowattHours * ssRate) < 0)

            document.querySelectorAll('td[data-name="sscr"]')[0].textContent = "cr";
        else
        
            document.querySelectorAll('td[data-name="sscr"]')[0].textContent = "";

        document.querySelectorAll('td[data-name="cl1direction"]')[0].textContent = "\u25BC";
        document.querySelectorAll('td[data-name="cl1direction"]')[0].style.color = "pink";
        document.querySelectorAll('td[data-name="ssdirection"]')[0].textContent = "\u25B2";
        document.querySelectorAll('td[data-name="ssdirection"]')[0].style.color = "#999999";
        document.querySelectorAll('td[data-name="pdirection"]')[0].textContent = "\u25BC";
        document.querySelectorAll('td[data-name="pdirection"]')[0].style.color = "red";
    }

    document.querySelectorAll('td[data-name="dcqty"]')[0].textContent = "1 day";
    const dcRate = document.getElementsByName('cfgdcrate')[0].value;
    document.querySelectorAll('td[data-name="dctotal"]')[0].textContent = '$' + (1 * dcRate).toFixed(2);

    document.querySelectorAll('td[data-name="dccl1qty"]')[0].textContent = "1 day";
    const dccl1Rate = document.getElementsByName('cfgdccl1rate')[0].value;
    document.querySelectorAll('td[data-name="dccl1total"]')[0].textContent = '$' + (1 * dccl1Rate).toFixed(2);

    solarWebEnhancedHistoricalChart.update('none');


}


async function saveSettings()
{
    await Neutralino.filesystem.writeFile('./settings.json', JSON.stringify(settingsJsonObj, null, 2));
}

function initElement(element, defaultValue, currentValue, eventName, eventFunction)
{
    if (currentValue == "")
        currentValue = defaultValue;

    element.value = currentValue;
    element.addEventListener(eventName, eventFunction);
    element.dispatchEvent(new Event(eventName));
}

function defaultElement(element, defaultValue)
{
    element.value = defaultValue;
    element.dispatchEvent(new Event("input"));
}

let getCurrentPower = async () => {

    await Neutralino.os.spawnProcess('C:/dwn/myapp/extensions/curl/bin/curl -k  http://' + document.getElementById('inverterAddress').value + '/solar_api/v1/GetPowerFlowRealtimeData.fcgi');
}


let getPastPower = async () => {

    document.getElementById('loading').textContent = 'loading...';
    document.getElementById("withSolar").checked = true;
    const today = document.getElementById('historicalChartDate').value;
    console.log("today=" + today);

    if (solarWebEnhancedHistoricalChart.data.datasets.length >= 1)

        solarWebEnhancedHistoricalChart.data.datasets[0].data = [];

    if (solarWebEnhancedHistoricalChart.data.datasets.length >= 2)

        solarWebEnhancedHistoricalChart.data.datasets[1].data = [];

    if (solarWebEnhancedHistoricalChart.data.datasets.length >= 3)

        solarWebEnhancedHistoricalChart.data.datasets[2].data = [];

    if (solarWebEnhancedHistoricalChart.data.datasets.length >= 4)

        solarWebEnhancedHistoricalChart.data.datasets[3].data = [];

    if (document.getElementById('views').value == 'powerIntradayView')
    {
        console.log("inverter historical chart data");
        await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/fronius_${today}.json`);
        //await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/fronius_2024-06-13.json`);
    }

    if (document.getElementById('views').value == 'powerIntradayV1View' || document.getElementById('views').value == 'powerIntradayV2View')
    {
        console.log("solar web historical chart data");
        await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/solar_web_${today}.json`);
        //await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/solar_web_2024-06-13.json`);
    }

    if (document.getElementById('views').value == 'powerDailyView' || document.getElementById('views').value == 'costDailyView')
    {
        console.log("solar web yearly historical chart data");
        await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/solar_web_2024.json`);
    }


}

let changeChart = async () => {

    const selectedChart = document.getElementById('views').value;
    console.log("selectedChart=" + selectedChart);

    if (selectedChart.includes('Intraday'))
    {
        document.querySelector('label[for="historicalChartDate"]').style.display = 'inline';
        document.getElementById('historicalChartDate').style.display = 'inline';
    }

    if (selectedChart.includes('Daily'))
    {
        document.querySelector('label[for="historicalChartDate"]').style.display = 'none';
        document.getElementById('historicalChartDate').style.display = 'none';
    }
    
    getPastPower();
}





Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

Neutralino.events.on('ready', async () => {

    await Neutralino.window.unmaximize();

    // Configuration
    let settingsJson = await Neutralino.filesystem.readFile('./settings.json');
    settingsJsonObj = JSON.parse(settingsJson);

    initElement(document.getElementById('inverterAddress'), NL_inverterIpAddressDef, settingsJsonObj.inverterIpAddress, "input", function() {
        settingsJsonObj.inverterIpAddress = this.value; saveSettings();
    });

    initElement(document.getElementById('gwidth'), NL_gaugesDef.width, settingsJsonObj.gauges.width, "input", function() {
        settingsJsonObj.gauges.width = this.value; saveSettings();
    });

    initElement(document.getElementById('gheight'), NL_gaugesDef.height, settingsJsonObj.gauges.height, "input", function() {
        settingsJsonObj.gauges.height = this.value; saveSettings();
    });

    // (async() => {
    //     console.log("waiting for variable");
    //     while(false) // define the condition as you like
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //     console.log("variable is defined");
    // })();

    // wait for the charts to be ready

    // waitForTrue(() => {
    //     // Your condition logic here
    //     try
    //     {
    //         fromSolarGauge.data.datasets[0].data[0] = 0;
    //     } catch (err)
    //     {
    //         console.log("waitForTrue is false");
    //         return false; // or false based on some logic
    //     }
    //     console.log("waitForTrue is true");
    //     return true;
    // });

    // (async() => {
    //     console.log("waiting for variable");
    //     while(!window.hasOwnProperty("fromSolarGauge.data.datasets[0].data[0]")) // define the condition as you like
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //     console.log("variable is defined");
    // })();

    // const observer = new MutationObserver((mutations, obs) => {
    //     if (fromSolarGauge.data.datasets) {
    //     // Element is now in the DOM
    //     // Perform operations with 'element'
    //     obs.disconnect(); // Stop observing once the element is found
    //     }
    //     });
        
    //     observer.observe(document.body, {
    //     childList: true, // Observe direct children
    //     subtree: true, // and lower descendants too
    //     });

    initElement(document.getElementById('pfs1limit'), NL_gaugesDef.powerFromSolar.band[0].limit, settingsJsonObj.gauges.powerFromSolar.band[0].limit, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[0].limit = this.value; 

        //fromSolarGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromSolar.band[0].limit;

        tryUntilNoException(() => { fromSolarGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromSolar.band[0].limit; });


        // waitForTrue(() => {
        //     // Your condition logic here
        //     try
        //     {
        //         fromSolarGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromSolar.band[0].limit;
        //     } catch (err)
        //     {
        //         console.log("waitForTrue is false");
        //         return false; // or false based on some logic
        //     }
        //     console.log("waitForTrue is true");
        //     return true;
        // });




        saveSettings();
    });

    initElement(document.getElementById('pfs2limit'), NL_gaugesDef.powerFromSolar.band[1].limit, settingsJsonObj.gauges.powerFromSolar.band[1].limit, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[1].limit = this.value; 
        //fromSolarGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromSolar.band[1].limit;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromSolar.band[1].limit; 
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs3limit'), NL_gaugesDef.powerFromSolar.band[2].limit, settingsJsonObj.gauges.powerFromSolar.band[2].limit, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[2].limit = this.value; 
        //fromSolarGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromSolar.band[2].limit;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromSolar.band[2].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs4limit'), NL_gaugesDef.powerFromSolar.band[3].limit, settingsJsonObj.gauges.powerFromSolar.band[3].limit, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[3].limit = this.value; 
        //fromSolarGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromSolar.band[3].limit;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromSolar.band[3].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs1colour'), NL_gaugesDef.powerFromSolar.band[0].colour, settingsJsonObj.gauges.powerFromSolar.band[0].colour, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[0].colour = this.value; 
        //fromSolarGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromSolar.band[0].colour;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromSolar.band[0].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs2colour'), NL_gaugesDef.powerFromSolar.band[1].colour, settingsJsonObj.gauges.powerFromSolar.band[1].colour, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[1].colour = this.value; 
        //fromSolarGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromSolar.band[1].colour;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromSolar.band[1].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs3colour'), NL_gaugesDef.powerFromSolar.band[2].colour, settingsJsonObj.gauges.powerFromSolar.band[2].colour, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[2].colour = this.value; 
        //fromSolarGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromSolar.band[2].colour;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromSolar.band[2].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfs4colour'), NL_gaugesDef.powerFromSolar.band[3].colour, settingsJsonObj.gauges.powerFromSolar.band[3].colour, "input", function() {
        settingsJsonObj.gauges.powerFromSolar.band[3].colour = this.value; 
        //fromSolarGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromSolar.band[3].colour;
        tryUntilNoException(() => { 
            fromSolarGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromSolar.band[3].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg1limit'), NL_gaugesDef.powerFromGrid.band[0].limit, settingsJsonObj.gauges.powerFromGrid.band[0].limit, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[0].limit = this.value; 
        //fromGridGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromGrid.band[0].limit;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromGrid.band[0].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg2limit'), NL_gaugesDef.powerFromGrid.band[1].limit, settingsJsonObj.gauges.powerFromGrid.band[1].limit, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[1].limit = this.value; 
        //fromGridGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromGrid.band[1].limit;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromGrid.band[1].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg3limit'), NL_gaugesDef.powerFromGrid.band[2].limit, settingsJsonObj.gauges.powerFromGrid.band[2].limit, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[2].limit = this.value; 
        //fromGridGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromGrid.band[2].limit;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromGrid.band[2].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg4limit'), NL_gaugesDef.powerFromGrid.band[3].limit, settingsJsonObj.gauges.powerFromGrid.band[3].limit, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[3].limit = this.value; 
        //fromGridGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromGrid.band[3].limit;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromGrid.band[3].limit;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg1colour'), NL_gaugesDef.powerFromGrid.band[0].colour, settingsJsonObj.gauges.powerFromGrid.band[0].colour, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[0].colour = this.value; 
        //fromGridGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromGrid.band[0].colour;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromGrid.band[0].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg2colour'), NL_gaugesDef.powerFromGrid.band[1].colour, settingsJsonObj.gauges.powerFromGrid.band[1].colour, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[1].colour = this.value; 
        //fromGridGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromGrid.band[1].colour;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromGrid.band[1].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg3colour'), NL_gaugesDef.powerFromGrid.band[2].colour, settingsJsonObj.gauges.powerFromGrid.band[2].colour, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[2].colour = this.value; 
        //fromGridGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromGrid.band[2].colour;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromGrid.band[2].colour;
        });
        saveSettings();
    });

    initElement(document.getElementById('pfg4colour'), NL_gaugesDef.powerFromGrid.band[3].colour, settingsJsonObj.gauges.powerFromGrid.band[3].colour, "input", function() {
        settingsJsonObj.gauges.powerFromGrid.band[3].colour = this.value; 
        //fromGridGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromGrid.band[3].colour;
        tryUntilNoException(() => { 
            fromGridGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromGrid.band[3].colour;
        });
        saveSettings();
    });



    const now = new Date()
    const todayShort = (new Date(now.getTime() - (now.getTimezoneOffset()*60*1000))).toISOString().split('T')[0]
    document.getElementById('historicalChartDate').value = todayShort;
    document.getElementById('historicalChartDate').addEventListener('change', getPastPower);


    (async() => {
        console.log("waiting for variable");
        while(!window.hasOwnProperty("overTimeChart.data")) // define the condition as you like
            await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("variable is defined");
    })();

    tryUntilNoException(() => { 
        overTimeChart.data.labels = ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
        overTimeChart.data.datasets[0].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        overTimeChart.data.datasets[1].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        overTimeChart.data.datasets[2].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        overTimeChart.data.datasets[3].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    });

    
    getCurrentPower();

    let currentPowerTimer = setInterval(function() {
        getCurrentPower();
    }, (1 * 1000)); // every 1 second

    getPastPower();

    fromSolarGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromSolar.band[0].colour;
    fromSolarGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromSolar.band[1].colour;
    fromSolarGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromSolar.band[2].colour;
    fromSolarGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromSolar.band[3].colour;
    fromSolarGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromSolar.band[0].limit;
    fromSolarGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromSolar.band[1].limit;
    fromSolarGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromSolar.band[2].limit;
    fromSolarGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromSolar.band[3].limit;
    fromGridGauge.data.datasets[0].backgroundColor[0] = settingsJsonObj.gauges.powerFromGrid.band[0].colour;
    fromGridGauge.data.datasets[0].backgroundColor[1] = settingsJsonObj.gauges.powerFromGrid.band[1].colour;
    fromGridGauge.data.datasets[0].backgroundColor[2] = settingsJsonObj.gauges.powerFromGrid.band[2].colour;
    fromGridGauge.data.datasets[0].backgroundColor[3] = settingsJsonObj.gauges.powerFromGrid.band[3].colour;
    fromGridGauge.data.datasets[0].data[0] = settingsJsonObj.gauges.powerFromGrid.band[0].limit;
    fromGridGauge.data.datasets[0].data[1] = settingsJsonObj.gauges.powerFromGrid.band[1].limit;
    fromGridGauge.data.datasets[0].data[2] = settingsJsonObj.gauges.powerFromGrid.band[2].limit;
    fromGridGauge.data.datasets[0].data[3] = settingsJsonObj.gauges.powerFromGrid.band[3].limit;

    document.getElementById('restoreDefault').addEventListener('click', function() {
        defaultElement(document.getElementById('inverterAddress'), NL_inverterIpAddressDef);
        defaultElement(document.getElementById('pfs1limit'), NL_gaugesDef.powerFromSolar.band[0].limit);
        defaultElement(document.getElementById('pfs2limit'), NL_gaugesDef.powerFromSolar.band[1].limit);
        defaultElement(document.getElementById('pfs3limit'), NL_gaugesDef.powerFromSolar.band[2].limit);
        defaultElement(document.getElementById('pfs4limit'), NL_gaugesDef.powerFromSolar.band[3].limit);
        defaultElement(document.getElementById('pfs1colour'), NL_gaugesDef.powerFromSolar.band[0].colour);
        defaultElement(document.getElementById('pfs2colour'), NL_gaugesDef.powerFromSolar.band[1].colour);
        defaultElement(document.getElementById('pfs3colour'), NL_gaugesDef.powerFromSolar.band[2].colour);
        defaultElement(document.getElementById('pfs4colour'), NL_gaugesDef.powerFromSolar.band[3].colour);
        defaultElement(document.getElementById('pfg1limit'), NL_gaugesDef.powerFromGrid.band[0].limit);
        defaultElement(document.getElementById('pfg2limit'), NL_gaugesDef.powerFromGrid.band[1].limit);
        defaultElement(document.getElementById('pfg3limit'), NL_gaugesDef.powerFromGrid.band[2].limit);
        defaultElement(document.getElementById('pfg4limit'), NL_gaugesDef.powerFromGrid.band[3].limit);
        defaultElement(document.getElementById('pfg1colour'), NL_gaugesDef.powerFromGrid.band[0].colour);
        defaultElement(document.getElementById('pfg2colour'), NL_gaugesDef.powerFromGrid.band[1].colour);
        defaultElement(document.getElementById('pfg3colour'), NL_gaugesDef.powerFromGrid.band[2].colour);
        defaultElement(document.getElementById('pfg4colour'), NL_gaugesDef.powerFromGrid.band[3].colour);
    });

    // billing

    const metersTable = document.getElementById('meters');
    let counter = 1;
    let element = document.getElementById('cfgc' + counter + 'meter');
    
    while (element) {
    
        if (element.value != 'none') {
            var newRow = metersTable.insertRow(-1);
            var newCell = newRow.insertCell(-1);
            newCell.setAttribute('data-name', element.value + "-direction");
            newCell.style.textAlign = 'left';
            newCell.innerHTML = '';
            var newCell = newRow.insertCell(-1);
            newCell.setAttribute('data-name', element.value);
            newCell.style.textAlign = 'left';
            newCell.innerHTML = element.value;
            var newCell = newRow.insertCell(-1);
            newCell.setAttribute('data-name', element.value + "-usage");
            newCell.style.textAlign = 'right';
            newCell.innerHTML = '';
        }

        counter++;
        element = document.getElementById('cfgc' + counter + 'meter');
    }

    const usageTable = document.getElementById('usage');
    counter = 1;
    element = document.getElementById('cfgc' + counter + 'name');
    
    while (element) {
    
        var newRow = usageTable.insertRow(-1);
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'direction';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'name').name.replace('cfg', '').replace('name', '') + 'direction');
        newCell.style.textAlign = 'left';
        newCell.innerHTML = ' ';
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'name';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'name').name.replace('cfg', ''));
        newCell.style.textAlign = 'left';
        newCell.innerHTML = document.getElementById('cfgc' + counter + 'name').value;
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'qty';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'name').name.replace('cfg', '').replace('name', '') + 'qty');
        newCell.style.textAlign = 'right';
        newCell.innerHTML = ' ';
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'rate';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'rate').name.replace('cfg', ''));
        newCell.style.textAlign = 'right';
        newCell.innerHTML = Number(document.getElementById('cfgc' + counter + 'rate').value) < 0 ? '-$' + Number(Math.abs(document.getElementById('cfgc' + counter + 'rate').value)).toFixed(5).toString() : '$' + Number(document.getElementById('cfgc' + counter + 'rate').value).toFixed(5);
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'total';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'name').name.replace('cfg', '').replace('name', '') + 'total');
        newCell.style.textAlign = 'right';
        newCell.innerHTML = ' ';
        var newCell = newRow.insertCell(-1);
        newCell.id = 'c' + counter + 'cr';
        newCell.setAttribute('data-name', document.getElementById('cfgc' + counter + 'name').name.replace('cfg', '').replace('name', '') + 'cr');
        newCell.style.textAlign = 'left';
        newCell.innerHTML = ' ';

        counter++;
        element = document.getElementById('cfgc' + counter + 'meter');
    }




});
