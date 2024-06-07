var stdoutMap = new Map();

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
            try {
                var jsonObj = JSON.parse(stdoutMap.get(evt.detail.id));

                if (jsonObj.hasOwnProperty("Body"))
                    handleCurrentPowerReply(jsonObj);
                else
                    handlePastPowerReply(jsonObj);
            } catch (error) {
                jsonObj = null;
            }
            stdoutMap.delete(evt.detail.id);
            //alert(JSON.stringify(jsonObj));

            break;
    }
});


function handleCurrentPowerReply(result)
{
    var d = new Date();
    var newLabel = d.toLocaleTimeString();
    
    var p_load = Math.abs(result.Body.Data.Site.P_Load);
    var p_grid_from_grid = 0;
    var p_grid_to_grid = 0;
    
    if (result.Body.Data.Site.P_Grid < 0)
        p_grid_to_grid = Math.abs(result.Body.Data.Site.P_Grid);
    else
        p_grid_from_grid = Math.abs(result.Body.Data.Site.P_Grid);
        
    var p_from_solar = p_load - p_grid_from_grid;

    addData(overTimeChart, newLabel, p_load, p_from_solar, p_grid_from_grid, p_grid_to_grid);
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




function handlePastPowerReply(jsonObj)
{
    var localTimestamp = jsonObj.map(item => item.local_timestamp.substring(11, 11+5));
    const consumptionIncrementalWatts = jsonObj.map(item => item.consumption_incremental_watts);
    const gridProductionIncrementalWatts = jsonObj.map(item => item.grid_production_incremental_watts);
    const internalConsumptionIncrementalWatts = jsonObj.map(item => item.internal_consumption_incremental_watts);

    // add any available timestamps to the end of the day
    localTimestamp = fillTimesArray(localTimestamp);

    const now = new Date(document.getElementById('historicalChartDate').value)
    const todayLong = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    //console.log(JSON.stringify(localTimestamp));
    historicalChart.data.labels = localTimestamp;
    historicalChart.data.datasets[0].data = consumptionIncrementalWatts;            // the solar web yellow area (consumed directly)
    historicalChart.data.datasets[1].data = gridProductionIncrementalWatts;         // the solar web gray area (Power to grid)
    historicalChart.data.datasets[2].data = internalConsumptionIncrementalWatts;    // the solar web blue line (consumption)
    historicalChart.options.plugins.title = { display: true, text: `Power in 5 minute intervals as at ${todayLong}` };
    historicalChart.update('none');
    
}



let getCurrentPower = async () => {

    await Neutralino.os.spawnProcess('C:/dwn/myapp/extensions/curl/bin/curl -k  http://192.168.0.109/solar_api/v1/GetPowerFlowRealtimeData.fcgi');
}


let getPastPower = async () => {

    const today = document.getElementById('historicalChartDate').value;
    //alert(today);
    await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/fronius_${today}.json`);
}






Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

Neutralino.events.on('ready', () => {
    const now = new Date()
    const todayShort = (new Date(now.getTime() - (now.getTimezoneOffset()*60*1000))).toISOString().split('T')[0]
    document.getElementById('historicalChartDate').value = todayShort;
    document.getElementById('historicalChartDate').addEventListener('change', getPastPower);


    (async() => {
        console.log("waiting for variable");
        while(!window.hasOwnProperty("overTimeChart.data.labels")) // define the condition as you like
            await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("variable is defined");
    })();


    overTimeChart.data.labels = ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
    overTimeChart.data.datasets[0].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    overTimeChart.data.datasets[1].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    overTimeChart.data.datasets[2].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    overTimeChart.data.datasets[3].data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    getCurrentPower();

    let currentPowerTimer = setInterval(function() {
        getCurrentPower();
    }, (1 * 1000)); // every 1 second

    getPastPower();

    let pastPowerTimer = setInterval(function() {
        getPastPower();
    }, (15 * 60 * 1000)); // every 15 minutes
});
