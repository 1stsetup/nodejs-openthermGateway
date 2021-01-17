This is a NodeJS modules to be able to connect to an Opentherm Gateway [(OTGW)](http://otgw.tclcode.com/index.html).

How to use: See openthermgw_example.js

Install
=======
```
npm install @1st-setup/openthermgateway
```

Usage:
======

Listening to traffic coming from OTGW:
--------------------------------------
```js
const openthermGatway = require('@1st-setup/openthermgateway');

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
    console.error(JSON.stringify(err,null,"\t"));
});

myOTGW.on("initialized",() => {
    console.log("Initialized");
    myOTGW.sendCommand("PS=0",(err, response) => {

    });
})

myOTGW.on("connected",() => {
    console.log("Connected");
})

myOTGW.on("otgwData",(data) => {
    console.log("otgw >> "+JSON.stringify(data,null,"\t"));
    console.log("otgw.data >> "+JSON.stringify(myOTGW.data,null,"\t"));
})

myOTGW.on("printSummary",(data) => {
    console.log("printSummary >> "+JSON.stringify(data,null,"\t"));
})
```

Sending commands to OTGW (see: [OTGW Serial commands](http://otgw.tclcode.com/firmware.html#configuration)):
--------------------------------------
```js
const openthermGatway = require('@1st-setup/openthermgateway');

var myOTGW = new openthermGatway("/dev/ttyUSB0",null, {debug:true});

// To get About opentherm gateway (prints the welcome message) 
myOTGW.sendCommand("PR=A", (err, response) => {
    if (err) {
        console.error(`Error sending command: Error:${err}`);
    }
    else {
        console.log(`Response to command PR=A: ${response}`);
    }
})
```

Class **openthermGatway**
-------------------------
**Methods:**

**_Constructor(serialDevice, serialOptions, otgwOptions)_**

Called when you use new to create a new openthermGateway object

Input:
* serialDevice: String containing ful path to serial device. E.g.: "/dev/ttyUSB0"
* serialOptions: Object containing [openOptions for the 'serialport' module](https://serialport.io/docs/api-stream#openoptions).
* otgwOptions: Object with following properties:

    * debug: Boolean. When 'true' all incoming and outgoing trafic on serial interface will be logged to console.

**_sendCommand(data, cb)_**

With this method you can send a command to the OTGW

Input:
* data: String with valid [OTGW Serial command](http://otgw.tclcode.com/firmware.html#configuration). E.g.: "PR=A"
* cb: Callback function which will be called when response is received on send command. Callback function is called with following arguments:

    * err: Object containing the error encountered.
    * response: The response from the OTGW on the send command.

**_decode(data)_**

With this method you can decode data, messages, received from the OTGW.

Input:
* data: String with the message received from the OTGW.

Output:
* Object with decoded message or null on error. Object will have following properties:

    * status: Character specifying what genereated the message.
        * "R": "Gateway to boiler"
        * "B": "From boiler"
        * "T": "From thermostat"
        * "A": "Gateway to thermostat"

    * direction: String telling what generated the message.
    * msgType: Hex code specifying the type of message.
    * msgTypeStr: String for msgType. Currently only: "Read-Ack" or "Read-Data".
    * id: Hex code specifying from which opentherm id the values are.
    * idStr: String with explanation of id. When id is not known this will be set to "UNKNOWN".
    * val1: Hex code for value part 1.
    * val2: Hex code for value part 2.
    * Status: Object. Only when id == "00" (OTGW_ID_STATUS). Each bit in val1 and val2 tells the status of different opentherm status fields. The properties in this object have the name of the field and the boolean value for the bit. True for set (1) and false when not set (0).
    * StatusStr: Object. Human readable version of Status object.
    * &lt;idStr&gt;: Depending on the id this is a Number (float), Number (integer), String ("&lt;val1&gt; &lt;val2&gt;")

**Events:**

Following event are emitted by the class:

* error: This is emitted when there is an error anywhere.
* exception: This is emitted when we receive a response for a command which was already answered.
* connected: When succesfully connected to OTGW.
* initialized: When succesfully communicated with the OTGW and received the response to following commands: PR=A (Get about), PR=M (Get mode)) and PR=W (Get if domestic hot water is enabled).
* inError: When a message is received from OTGW but we cannot decode it.
* otgwData: When data is received and decoded from OTGW.
* otgwError: When the OTGW reported and error. This happens when a wrong command was given, a wrong formatted command value was specified or something in the opentherm communication for the gateway went wrong.
* printSummary: When the Print Summary mode command "PS=1" is send this event will follow it. 