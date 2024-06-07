var currentPowerProc;
var currentPowerProcData;
var currentPowerProcDataChunks;
var pastPowerProc;
var pastPowerProcData;
var pastPowerProcDataChunks;
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
            var jsonObj = null;

            try {
                jsonObj = JSON.parse(stdoutMap.get(evt.detail.id));
            } catch (error) {
                jsonObj = null;
            }
            stdoutMap.delete(evt.detail.id);
            //alert(JSON.stringify(jsonObj));

            if (jsonObj != null)
            {
                if (jsonObj.hasOwnProperty("Body"))
                    handleCurrentPowerReply(jsonObj);
                else
                    handlePastPowerReply(jsonObj);
            }

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

function handlePastPowerReply(jsonObj)
{
    const localTimestamp = jsonObj.map(item => item.local_timestamp.substring(11, 11+5));
    const consumptionIncrementalWatts = jsonObj.map(item => item.consumption_incremental_watts);
    const gridProductionIncrementalWatts = jsonObj.map(item => item.grid_production_incremental_watts);
    const internalConsumptionIncrementalWatts = jsonObj.map(item => item.internal_consumption_incremental_watts);

    //console.log(localTimestamp);
    const now = new Date()
    const todayLong = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    historicalChart.data.labels = localTimestamp;
    historicalChart.data.datasets[0].data = consumptionIncrementalWatts;            // the solar web yellow area (consumed directly)
    historicalChart.data.datasets[1].data = gridProductionIncrementalWatts;         // the solar web gray area (Power to grid)
    historicalChart.data.datasets[2].data = internalConsumptionIncrementalWatts;    // the solar web blue line (consumption)
    historicalChart.options.plugins.title = { display: true, text: `Power every five minutes as of ${todayLong}` };
    historicalChart.update('none');
    
}



let getCurrentPower = async () => {
    // const key = NL_OS == 'Windows' ? 'USERNAME' : 'USER';
    // let value = '';
    // try {
    //     value = await Neutralino.os.getEnv(key);
    // }
    // catch(err) {
    //     console.error(err);
    // }
    //document.getElementById('name').innerText = `Hello ${value}`;

    currentPowerProcDataChunks = [];
    currentPowerProc = await Neutralino.os.spawnProcess('C:/dwn/myapp/extensions/curl/bin/curl -k  http://192.168.0.109/solar_api/v1/GetPowerFlowRealtimeData.fcgi');
    //alert('pingProc=' + pingProc.pid);
}


let getPastPower = async () => {
    // const key = NL_OS == 'Windows' ? 'USERNAME' : 'USER';
    // let value = '';
    // try {
    //     value = await Neutralino.os.getEnv(key);
    // }
    // catch(err) {
    //     console.error(err);
    // }
    //document.getElementById('name').innerText = `Hello ${value}`;

    //const now = new Date()
    //const today = (new Date(now.getTime() - (now.getTimezoneOffset()*60*1000))).toISOString().split('T')[0]
    const today = document.getElementById('historicalChartDate').value;
    //alert(today);
    pastPowerProcData = "";
    pastPowerProcDataChunks = [];
    pastPowerProc = await Neutralino.os.spawnProcess(`C:/dwn/myapp/extensions/curl/bin/curl -k  https://seanhaydongriffin.github.io/family-tree/fronius_data/fronius_${today}.json`);
    //alert('pingProc2=' + pingProc2.pid);

    // Neutralino.events.on('spawnedProcess', (evt) => {
    //     if(pingProc2.id == evt.detail.id) {
    //         switch(evt.detail.action) {
    //             case 'stdOut':
                    
    //                 //handleReply(evt.detail.data);
    //                 console.log(evt.detail.data);
    //                 break;
    //             case 'stdErr':
    //                 //console.error(evt.detail.data);
    //                 break;
    //             case 'exit':
    //                 //console.log(`Ping process terminated with exit code: ${evt.detail.data}`);
    //                 break;
    //         }
    //     }
    // });
}






Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

Neutralino.events.on('ready', () => {
    const now = new Date()
    const todayShort = (new Date(now.getTime() - (now.getTimezoneOffset()*60*1000))).toISOString().split('T')[0]
    document.getElementById('historicalChartDate').value = todayShort;
    //alert(document.getElementById('historicalChartDate').value);

    document.getElementById('historicalChartDate').addEventListener('change', getPastPower);

    getCurrentPower();

    let currentPowerTimer = setInterval(function() {
        getCurrentPower();
    }, (1 * 1000)); // every 1 second

    getPastPower();

    let pastPowerTimer = setInterval(function() {
        getPastPower();
    }, (15 * 60 * 1000)); // every 15 minutes
});
