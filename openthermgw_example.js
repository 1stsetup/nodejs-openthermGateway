const openthermGatway = require('./openthermgateway.js');

var myOTGW = new openthermGatway("/dev/ttyUSB0",null, {debug:true});
myOTGW.on("error", (err) => {
    console.error(err.toString());
});

myOTGW.on("exception", (err) => {
    console.error(err.toString());
});

myOTGW.on("inError", (err) => {
    console.error(err.toString());
});

myOTGW.on("otgwError", (err) => {
    console.error(err.toString());
});

myOTGW.on("initialized",() => {
    console.log("Initialized");
    myOTGW.sendCommand("PS=1",(err, response) => {

    });
})

myOTGW.on("connected",() => {
    console.log("Connected");
})

myOTGW.on("otgwData",(data) => {
    console.log("otgw >> "+JSON.stringify(data,null,"\t"));
})

myOTGW.on("printSummary",(data) => {
    console.log("printSummary >> "+JSON.stringify(data,null,"\t"));
})