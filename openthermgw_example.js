const openthermGatway = require('./openthermgateway.js');

var myOTGW = new openthermGatway("/dev/ttyUSB0",null, {debug:true});
myOTGW.on("error", (err) => {
    console.error(err);
});

myOTGW.on("exception", (err) => {
    console.error(err);
});

myOTGW.on("inError", (err) => {
    console.error(err);
});

myOTGW.on("initialized",() => {
    console.log("Initialized");
})

myOTGW.on("connected",() => {
    console.log("Connected");
})

myOTGW.on("otgwData",(data) => {
    console.log("otgw >> "+JSON.stringify(data,null,"\t"));
})