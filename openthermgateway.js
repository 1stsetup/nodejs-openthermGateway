const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const EventEmitter = require('events');

/**
 * 
 * @param {number | string} value 
 * @returns {boolean}
 */
function isFloat(value) {
    if (typeof value == "object") return false;

    if (typeof value == "string") {
        value = value * 1;
    }
    return !Number.isInteger(value);
}

/**
 * 
 * @param {number | string} value 
 * @returns {boolean}
 */
function isInteger(value) {
    if (typeof value == "object") return false;

    if (typeof value == "string") {
        value = value * 1;
    }
    return Number.isInteger(value);
}

/**
 * 
 * @param {number | string} value 
 * @returns {boolean}
 */
function isNumber(value) {
    return isFloat(value) || isInteger(value);
}

/**
 * 
 * @param {string} value 
 * @returns {boolean}
 */
function isString(value) {
    return (typeof value == "string");
}

/**
 * 
 * @param {string} value 
 * @returns {boolean}
 */
function isHex(value) {
    if (!typeof value == "string") return false;

    return value.match(/[0-9A-F]{2}/);
}

/**
 * 
 * @param {string} value 
 * @returns {boolean}
 */
function isTimeAndDay(value) {
    if (typeof value != "string") return false;

    if (value.indexOf(':') == -1) return false;
    if (value.indexOf('/') == -1) return false;

    let matches = value.match(/(?<hours>\d){1,2}:(?<minutes>\d\d)\/(?<weekday>[1-7])/);
    let hours = 24;
    let minutes = 60;
    let weekday = 0;
    if (matches) {
        hours = matches.groups.hours;
        minutes = matches.groups.minutes;
        weekday = matches.groups.weekday;
    }
    if (hours>23) return false;
    if (minutes>59) return false;
    if (weekday<1 || weekday>7) return false;

    return true;
}

const OTGW_COMMANDS = {
// TT=temperature
//  Temperature, Temporary - Temporarily change the thermostat setpoint. The thermostat program will resume at the next programmed setpoint change. Values between 0.0 and 30.0 are allowed. A value of 0 indicates no remote override is to be applied.
//  Examples: TT=19.5, TT=0
    "TT": { check: isNumber}, 
// TC=temperature
// Temperature, Constant - Change the thermostat setpoint. The thermostat program will not change this setting. Values between 0.0 and 30.0 are allowed. A value of 0 cancels the remote override.
// Examples: TC=16.0, TC=0 
    "TC": { check: isNumber}, 
// OT=temperature
// Outside temperature - Configures the outside temperature to send to the thermostat. Allowed values are between -40.0 and +64.0, although thermostats may not display the full range. Specify a value above 64 (suggestion: 99) to clear a previously configured value.
// Examples: OT=-3.5, OT=99 
    "OT": { check: isNumber}, 
// SC=time/day
// Set Clock - Change the time and day of the week of the thermostat. The gateway will send the specified time and day of the week in response to the next time and date message from the thermostat. The time must be specified as HH:MM. The day of the week must be specified as a single digit between 1 (Monday) and 7 (Sunday).
// Examples: SC=9:00/1, SC=23:59/4 
    "SC": { check: isTimeAndDay}, 
// HW=state
// Hot Water - Control the domestic hot water enable option. If the boiler has been configured to let the room unit control when to keep a small amount of water preheated, this command can influence that. A state of 0 or 1 will tell the boiler whether or not to keep the water warm. Any other single character causes the gateway to let the thermostat control the boiler. Possible values are 0, 1, or any other single character.
// Examples: HW=1, HW=T 
    "HW": { check: (value) => {
        return true;
    }}, 

// PR=item
// Print Report - Request the gateway to report some information item. The following items are currently defined:

//     A: About opentherm gateway (prints the welcome message)
//     B: Build date and time
//     C: The clock speed the code was compiled for (4 MHz)
//     G: Configured functions for the two GPIO pins. The response will be 2 digits that represent the functions of GPIO A and GPIO B respectively.
//     I: Current state of the two GPIO pins. The response will be 2 digits that represent the level (0 or 1) of GPIO A and GPIO B respectively.
//     L: Configured functions for all 6 LEDS. The response consists of 6 letters representing the functions of LED A through LED F.
//     M: Gateway mode. G=Gateway, M=Monitor.
//     O: Report the setpoint override value
//     P: Current Smart-Power mode (low/medium/high).
//     R: The state of the automatic Remeha thermostat detection.
//     S: The configured setback temperature.
//     T: Tweaks. Reports the state of the ignore transitions and override in high byte settings.
//     V: Report the reference voltage setting
//     W: Report the domestic hot water setting 

// Examples: PR=L, PR=A 
    "PR": { check: (value) => {
        return ["A","B","C","G","I","L","M","O","P","R","S","T","V","W"].includes(value);
    }}, 
// PS=state
// Print Summary - The opentherm gateway normally prints every opentherm message it receives, as well as the modified messages it transmits. In some applications it may be more useful to only get a report of the latest values received for the most interesting parameters on demand. Issuing a "PS=1" command will stop the reports for each message and print one line with the following values:

//     Status (MsgID=0) - Printed as two 8-bit bitfields
//     Control setpoint (MsgID=1) - Printed as a floating point value
//     Remote parameter flags (MsgID= 6) - Printed as two 8-bit bitfields
//     Maximum relative modulation level (MsgID=14) - Printed as a floating point value
//     Boiler capacity and modulation limits (MsgID=15) - Printed as two bytes
//     Room Setpoint (MsgID=16) - Printed as a floating point value
//     Relative modulation level (MsgID=17) - Printed as a floating point value
//     CH water pressure (MsgID=18) - Printed as a floating point value
//     Room temperature (MsgID=24) - Printed as a floating point value
//     Boiler water temperature (MsgID=25) - Printed as a floating point value
//     DHW temperature (MsgID=26) - Printed as a floating point value
//     Outside temperature (MsgID=27) - Printed as a floating point value
//     Return water temperature (MsgID=28) - Printed as a floating point value
//     DHW setpoint boundaries (MsgID=48) - Printed as two bytes
//     Max CH setpoint boundaries (MsgID=49) - Printed as two bytes
//     DHW setpoint (MsgID=56) - Printed as a floating point value
//     Max CH water setpoint (MsgID=57) - Printed as a floating point value
//     Burner starts (MsgID=116) - Printed as a decimal value
//     CH pump starts (MsgID=117) - Printed as a decimal value
//     DHW pump/valve starts (MsgID=118) - Printed as a decimal value
//     DHW burner starts (MsgID=119) - Printed as a decimal value
//     Burner operation hours (MsgID=120) - Printed as a decimal value
//     CH pump operation hours (MsgID=121) - Printed as a decimal value
//     DHW pump/valve operation hours (MsgID=122) - Printed as a decimal value
//     DHW burner operation hours (MsgID=123) - Printed as a decimal value 

// A new report can be requested by repeating the "PS=1" command.
// Examples: PS=1, PS=0 
    "PS": { check: (value) => {
        return [0, 1, "0", "1"].includes(value);
    }}, 
// GW=state
// GateWay - The opentherm gateway starts up in back-to-back mode. While this is the most useful mode of operation, it also means that the firmware must be able to decode the requests received from the thermostat before it can send them on to the boiler. The same is true for responses from the boiler back to the thermostat. By changing this setting to "0" (monitor mode), the received signal level is passed through to the output driver without any processing. This can be a useful diagnostic tool when there are communication problems immediately after the gateway has been built. See the troubleshooting section for more information. This command can also be used to reset the gateway by specifying "R" as the state value.
// Examples: GW=1, GW=R 
    "GW": { check: (value) => {
        return [0, 1, "0", "1", "R"].includes(value);
    }}, 
// LA=function
// LB=function
// LC=function
// LD=function
// LE=function
// LF=function
// LED A / LED B / LED C / LED D / LED E / LED F - These commands can be used to configure the functions of the six LEDs that can optionally be connected to pins RB3/RB4/RB6/RB7 and the GPIO pins of the PIC. The following functions are currently available:

//     R: Receiving an Opentherm message from the thermostat or boiler
//     X: Transmitting an Opentherm message to the thermostat or boiler
//     T: Transmitting or receiving a message on the master interface
//     B: Transmitting or receiving a message on the slave interface
//     O: Remote setpoint override is active
//     F: Flame is on
//     H: Central heating is on
//     W: Hot water is on
//     C: Comfort mode (Domestic Hot Water Enable) is on
//     E: Transmission error has been detected
//     M: Boiler requires maintenance
//     P: Raised power mode active on thermostat interface. 

// Examples: LC=F, LD=M 
    "LA": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
    "LB": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
    "LC": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
    "LD": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
    "LE": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
    "LF": { check: (value) => { return ["R","X","T","B","O","F","H","W","C","E","M","P"].includes(value); }}, 
// GA=function
// GB=function
// GPIO A / GPIO B - These commands configure the functions of the two GPIO pins of the gateway. The following functions are available:

//     0: No function, default for both ports on a freshly flashed chip.
//     1: Ground - A permanently low output (0V). Could be used for a power LED.
//     2: Vcc - A permanently high output (5V). Can be used as a short-proof power supply for some external circuitry used by the other GPIO port.
//     3: LED E - An additional LED if you want to present more than 4 LED functions.
//     4: LED F - An additional LED if you want to present more than 5 LED functions.
//     5: Home - Set thermostat to setback temperature when pulled low.
//     6: Away - Set thermostat to setback temperature when pulled high.
//     7: DS1820 (GPIO port B only) - Data line for a DS18S20 or DS18B20 temperature sensor used to measure the outside temperature. A 4k7 resistor should be connected between GPIO port B and Vcc. 
// Examples: GA=2, GB=7 
    "GA": { check: (value) => { return [0,1,2,3,4,5,6,7,"0","1","2","3","4","5","6","7"].includes(value); }}, 
    "GB": { check: (value) => { return [0,1,2,3,4,5,6,7,"0","1","2","3","4","5","6","7"].includes(value); }}, 
// SB=Data-ID
// SetBack temperature - Configure the setback temperature to use in combination with GPIO functions HOME (5) and AWAY (6). Note: The SB command may need to store 2 bytes in EEPROM. This takes more time than it takes to transfer a command over the serial interface. If you immediately follow the SB command by more commands that store configuration data in EEPROM, the gateway may not be able to handle all commands. To avoid any problems when sending a sequence of configuration commands, send the SB command last.
// Examples: SB=15, SB=16.5 
    "SB": { check: isNumber}, 
// AA=Data-ID
// Add Alternative - Add the specified Data-ID to the list of alternative commands to send to the boiler instead of a Data-ID that is known to be unsupported by the boiler. Alternative Data-IDs will always be sent to the boiler in a Read-Data request message with the data-value set to zero. The table of alternative Data-IDs is stored in non-volatile memory so it will persist even if the gateway has been powered off. Data-ID values from 1 to 255 are allowed.
// Examples: AA=33, AA=117 
    "AA": { check: isInteger}, 
// DA=Data-ID
// Delete Alternative - Remove the specified Data-ID from the list of alternative commands. Only one occurrence is deleted. If the Data-ID appears multiple times in the list of alternative commands, this command must be repeated to delete all occurrences. The table of alternative Data-IDs is stored in non-volatile memory so it will persist even if the gateway has been powered off. Data-ID values from 1 to 255 are allowed.
// Examples: DA=116, DA=123 
    "DA": { check: isInteger}, 
// UI=Data-ID
// Unknown ID - Inform the gateway that the boiler doesn't support the specified Data-ID, even if the boiler doesn't indicate that by returning an Unknown-DataId response. Using this command allows the gateway to send an alternative Data-ID to the boiler instead.
// Examples: UI=18, UI=6 
    "UI": { check: isInteger}, 
// KI=Data-ID
// Known ID - Start forwarding the specified Data-ID to the boiler again. This command resets the counter used to determine if the specified Data-ID is supported by the boiler.
// Examples: KI=18, KI=123 
    "KI": { check: isInteger}, 
// PM=Data-ID
// Priority Message - Specify a one-time priority message to be sent to the boiler at the first opportunity. If the specified message returns the number of Transparent Slave Parameters (TSPs) or Fault History Buffers (FHBs), the gateway will proceed to request those TSPs or FHBs.
// Example: PM=10, PM=72 
    "PM": { check: isInteger}, 
// SR=Data-ID:data
// Set Response - Configure a response to send back to the thermostat instead of the response produced by the boiler. The data argument is either one or two bytes separated by a comma.
// Example: SR=18:1,205, SR=70:14 
    "SR": { check: (value) => {return true} }, 
// CR=Data-ID
// Clear Response - Clear a previously configured response to send back to the thermostat.
// Example: CR=18, CR=70 
    "CR": { check: isInteger}, 
// SH=temperature
// Setpoint Heating - Set the maximum central heating setpoint. This command is only available with boilers that support this function.
// Examples: SH=72.5, SH=+20 
    "SH": { check: isNumber}, 
// SW=temperature
// Setpoint Water - Set the domestic hot water setpoint. This command is only available with boilers that support this function.
// Examples: SW=60, SW=+40.0 
    "SW": { check: isNumber}, 
// MM=percentage
// Maximum Modulation - Override the maximum relative modulation from the thermostat. Valid values are 0 through 100. Clear the setting by specifying a non-numeric value.
// Examples: MM=100, MM=T 
    "MM": { check: (value) => {return true}}, 
// CS=temperature
// Control Setpoint - Manipulate the control setpoint being sent to the boiler. Set to 0 to pass along the value specified by the thermostat. To stop the boiler heating the house, set the control setpoint to some low value and clear the CH enable bit using the CH command.
// Warning: manipulating these values may severely impact the control algorithm of the thermostat, which may cause it to start heating much too early or too aggressively when it is actually in control.
// Example: CS=45.8, CS=0 
    "CS": { check: isNumber}, 
// CH=state
// Central Heating - When using external control of the control setpoint (via a CS command with a value other than 0), the gateway sends a CH enable bit in MsgID 0 that is controlled using the CH command. Initially this bit is set to 1. When external control of the control setpoint is disabled (CS=0), the CH enable bit is controlled by the thermostat.
// Example: CH=0, CH=1 
    "CH": { check: (value) => { return [0,1,"0","1"].includes(value); }}, 
// VS=percentage
// Ventilation Setpoint - Configure a ventilation setpoint override value.
// Example: VS=25, VS=100 
    "VS": { check: isInteger}, 
// RS=counter
// Reset - Clear boiler counter, if supported by the boiler. Available counter names are:
// HBS		Central heating burner starts
// HBH		Central heating burner operation hours
// HPS		Central heating pump starts
// HPH		Central heating pump operation hours
// WBS		Domestic hot water burner starts
// WBH		Domestic hot water burner operation hours
// WPS		Domestic hot water pump starts
// WPH		Domestic hot water pump operation hours
    "RS": { check: (value) => { return ["HBS","HBH","HPS","HPH","WBS","WBH","WPS","WPH"].includes(value); }}, 
// IT=state
// Ignore Transitions - If the opentherm signal doesn't cleanly transition from one level to the other, the circuitry may detect multiple transitions when there should only be one. When this setting is off (IT=0), the gateway will report "Error 01" for those cases. With this setting on (IT=1), any rapid bouncing of the signal is ignored. This is the default.
// Examples: IT=0, IT=1 
    "IT": { check: (value) => { return [0,1,"0","1"].includes(value); }}, 
// OH=state
// Override in High byte - The Opentherm specification contains contradicting information about which data byte of Data-ID 100 should hold the override bits. When this setting is off (OH=0), the gateway will only put the bits in the low byte. When the setting is on (OH=1), the bits are copied to the high byte so they appear in both bytes. This is the default.
// Examples: OH=0, OH=1 
    "OH": { check: (value) => { return [0,1,"0","1"].includes(value); }}, 
// FT=model
// Force Thermostat - To be able to apply special treatment required by some thermostat models, the gateway will try to auto-detect which thermostat is connected. In some cases it is unable to determine this correctly. This configuration option can then be used to force the model. Valid models are: 'C' (Remeha Celcia 20) and 'I' (Remeha iSense). Any other letter restores the default auto-detect functionality.
// Examples: FT=C, FT=D 
    "FT": { check: (value) => { return ["C","I"].includes(value); }}, 
// VR=level
// Voltage Reference - Change the reference voltage used as a threshold for the comparators. This configuration option is stored in non-volatile memory so it will persist even if the gateway has been powered off. The level must be specified as a single digit according to the following table:
// 0 	1 	2 	3 	4 	5 	6 	7 	8 	9
// 0.625V 	0.833V 	1.042V 	1.250V 	1.458V 	1.667V 	1.875V 	2.083V 	2.292V 	2.500V
// The normal value is 3.
// Examples: VR=3, VR=4 
    "VR": { check: (value) => { return [0,1,2,3,4,5,6,7,8,9,0,"0","1","2","3","4","5","6","7","8","9"].includes(value); }}, 
// DP=address
// Debug Pointer - Set the debug pointer to a file register. If the debug pointer has been set to a value other than 00, the contents of the selected file register will be reported over the serial interface after each received OpenTherm message. The address must be specified as two hexadecimal digits. Setting the pointer to 00 switches off the debug reports.
// Examples: DP=1F, DP=00 
    "DP": { check: isHex }
}

const OTGW_DIRECTIONS = {
    "R": "Gateway to boiler",
    "B": "From boiler",
    "T": "From thermostat",
    "A": "Gateway to thermostat"
}

const OTGW_ID_STATUS="00";
const OTGW_ID_CONTROLSETPOINT="01";
const OTGW_ID_MASTERMEMBERID="02";
const OTGW_ID_SLAVEMEMBERID="03";
const OTGW_ID_FAULTCODE="05";
const OTGW_ID_COOLINGCONTROLSIGNAL="07";
const OTGW_ID_CH2CONTROLSETPOINT="08";
const OTGW_ID_REMOTEOVERRIDEROOMSETPOINT="09";
const OTGW_ID_TSPNUMBER="0A";
const OTGW_ID_TSPINDEXANDTSPVALUE="0B";
const OTGW_ID_FHBSIZE="0C";
const OTGW_ID_FHBINDEXANDFHBVALUE="0D";
const OTGW_ID_MAXRELATIVEMODULATIONLEVEL="0E";
const OTGW_ID_BOILERCAPACITYANDMODULATIONLIMITS="0F";
const OTGW_ID_ROOMSETPOINT="10";
const OTGW_ID_RELATIVEMODULATIONLEVEL="11";
const OTGW_ID_CH_WATERPRESSURE="12";
const OTGW_ID_DHWFLOWRATE="13";
const OTGW_ID_DAYTIME="14";
const OTGW_ID_DATE="15";
const OTGW_ID_YEAR="16";
const OTGW_ID_CH2CURRENTSETPOINT="17";
const OTGW_ID_CURRENTTEMPERATURE="18";
const OTGW_ID_BOILERWATERTEMPERATURE="19";
const OTGW_ID_DHWTEMPERATURE="1A";
const OTGW_ID_OUTSIDETEMPERATURE="1B";
const OTGW_ID_RETURNWATERTEMPERATURE="1C";
const OTGW_ID_SOLARSTORAGETEMPERATURE="1D";
const OTGW_ID_SOLARCOLLECTORTEMPERATURE="1E";
const OTGW_ID_CH2FLOWTEMPERATURE="1F";
const OTGW_ID_DHW2TEMPERATURE="20";
const OTGW_ID_BOILEREXHAUSTTEMPERATURE="21";
const OTGW_ID_DHWBOUNADRIES="30";
const OTGW_ID_CHBOUNDARIES="31";
const OTGW_ID_OTCBOUNDARIES="32";
const OTGW_ID_DHWSETPOINT="38";
const OTGW_ID_MAXCHWATERSETPOINT_39="39";
const OTGW_ID_MAXCHWATERSETPOINT_3A="3A";
const OTGW_ID_OTCHEATCURVERATIO="3B";
const OTGW_ID_STARTSBURNER="74";
const OTGW_ID_STARTSCHPUMP="75";
const OTGW_ID_STARTSHDWPUMP="76";
const OTGW_ID_STARTSBURNERDHW_77="77";
const OTGW_ID_STARTSBURNERDHW_78="78";
const OTGW_ID_HOURSCHPUMP_79="79";
const OTGW_ID_HOURSCHPUMP_7A="7A";
const OTGW_ID_HOURSPUMPDHW="7B";
const OTGW_ID_MASTEROPENTHERMVERSION="7C";
const OTGW_ID_SLAVEOPENTHERMVERSION="7D";
const OTGW_ID_MASTERPRODUCTTYPEANDVERSION="7E";
const OTGW_ID_SLAVEPRODUCTTYPEANDVERSION="7F";

const OPENTHERM_IDS = {
    "00": "Status",
    "01": "ControlSetpoint",
    "02": "MasterMemberId",
    "03": "SlaveMemberId",
    "05": "FaultCode",
    "07": "CoolingControlSignal",
    "08": "CH2ControlSetpoint",
    "09": "RemoteOverrideRoomSetpoint",
    "0A": "TSPNumber",
    "0B": "TSPIndexAndTSPValue",
    "0C": "FHBSize",
    "0D": "FHBIndexAndFHBValue",
    "0E": "MaxRelativeModulationLevel",
    "0F": "BoilerCapacityAndModulationLimits",
    "10": "RoomSetpoint",
    "11": "RelativeModulationLevel",
    "12": "CH-WaterPressure",
    "13": "DHWFlowRate",
    "14": "Daytime",
    "15": "Date",
    "16": "Year",
    "17": "CH2CurrentSetpoint",
    "18": "CurrentTemperature",
    "19": "BoilerWaterTemperature",
    "1A": "DHWTemperature",
    "1B": "OutsideTemperature",
    "1C": "ReturnWaterTemperature",
    "1D": "SolarStorageTemperature",
    "1E": "SolarCollectorTemperature",
    "1F": "CH2FlowTemperature",
    "20": "DHW2Temperature",
    "21": "BoilerExhaustTemperature",
    "30": "DHWBounadries",
    "31": "CHBoundaries",
    "32": "OTCBoundaries",
    "38": "DHWSetpoint",
    "39": "MaxCHWaterSetpoint",
    "3A": "MaxCHWaterSetpoint",
    "3B": "OTCHeatCurveRatio",
    "74": "StartsBurner",
    "75": "StartsCHPump",
    "76": "StartsHDWPump",
    "77": "StartsBurnerDHW",
    "78": "StartsBurnerDHW",
    "79": "HoursCHPump",
    "7A": "HoursCHPump",
    "7B": "HoursPumpDHW",
    "7C": "MasterOpenThermVersion",
    "7D": "SlaveOpenThermVersion",
    "7E": "MasterProductTypeAndVersion",
    "7F": "SlaveProductTypeAndVersion"
}

const OTGW_RESPONSE_ERRORS = {
    "NG": "No Good", 
    "SE": "Syntax Error", 
    "BV": "Bad Value", 
    "OR": "Out of Range", 
    "NS": "No Space", 
    "NF": "Not Found", 
    "OE": "Overrun Error."
}

const PRINT_SUMMARY_FIELDS = [
    "Status",
    "Control setpoint",
    "Remote parameter flags",
    "Maximum relative modulation level",
    "Boiler capacity and modulation limits",
    "Room setpoint",
    "Relative modulation level",
    "CH water pressure",
    "Room temperature",
    "Boiler water temperature",
    "DHW temperature",
    "Outside temperature",
    "Return water temperature",
    "DHW setpoint boundaries",
    "Max CH setpoint boundaries",
    "DHW setpoint",
    "Max CH water setpoint",
    "Burner starts",
    "CH pump starts",
    "DHW pump/valve starts",
    "DHW burner starts",
    "Burner operation hours",
    "CH pump operation hours",
    "DHW pump/valve operation hours",
    "DHW burner operation hours"
]
/**
 * 
 * @param {number} val1 
 * @param {number} val2 
 * @returns {number}
 */
function toFloat(val1, val2) {
    let total = (val1 << 8) + val2;
    if ((total & 0x8000) == 0x8000) {
        total = total - 65536;
    }

    return total / 256.0;
}

class openthermGatway extends EventEmitter {
    /**
     * @param {string} serialDevice
     * @param {object} serialOptions
     * @param {object} otgwOptions
     */
    constructor(serialDevice, serialOptions, otgwOptions) {
        super();

        var self = this;
        this._data = {};
        this._serialOptions = serialOptions;
        if (!this._serialOptions) {
            this._serialOptions = {};
        }
        this._serialOptions.autoOpen = false;
        this._serialDevice = serialDevice;
        this._options = otgwOptions;
        this._ps = 0;
        this._port = new SerialPort(this._serialDevice, this._serialOptions);
        this._parser = this._port.pipe(new Readline({ delimiter: '\r\n' }));
        this._parser.on('data', (data) => {
            self.onParserData(data);});
        this._connected = false;
        this._initialized = false;
        this._queue = [];

        this._debug = otgwOptions.hasOwnProperty("debug") ? otgwOptions.debug : false;
        this._port.open((err) => {
            if (err) {
                this.emit("error", {
                    toString: function() { return `Error opening serialport '${self._serialDevice}. Error: ${err.toString()}` },
                    error: err
                });
            }
            else {
                self.connected = true;
            }
        })
    }

    get mode() {
        return this._mode;
    }

    get about() {
        return this._about;
    }
    
    get data() {
        let result = {};
        for(var property in this._data) {
            result[property] = this._data[property];
        }
        return result;
    }

    get initialized() {
        return this._initialized;
    }

    /**
     * @param {boolean} value
     */
    set initialized(value) {
        if (value != this.initialized) {
            this._initialized = value;
            if (value === true) {
                this.emit("initialized");
            }
        }
    }

    get connected() {
        return this._connected;
    }

    /**
     * @param {boolean} value
     */
    set connected(value) {
        var self = this;
        if (value != this.connected) {
            this.initialized = false;
            this._connected = value;
            if (value === true) {
                this.emit("connected");
                // Get about of otgw
                this.sendCommand("PR=A", (err, response) => {
                    if (!err) {
                        self._about = response;
                        // Get if the otgw is in gateway or monitor mode.
                        self.sendCommand("PR=M", (err, response) => {
                            if (!err) {
                                self._mode = response == "G" ? "Gateway" : "Monitor";
                                // Get if the domestic hot water is enabled.
                                self.sendCommand("PR=W", (err, response) => {
                                    if (!err) {
                                        self._domesticHotWaterEnabled = (response == "1");
                                        self.initialized = true;
                                    }
                                })
       
                            }
                        })
                    }
                })
            }
            else {
                this.emit("disconnected");
            }
        }
    }

    onParserData(data) {
        // All data from serial device ends up here.
        // Also responses from commands send.

        let _data;
        if (Buffer.isBuffer(data)) {
            _data = data.toString();
        }
        else {
            _data = data;
        }

        if (this._debug) console.log("openthermGateway.onParserData:"+_data);

        if (_data.indexOf(": ") > -1) {
            // Response to command
            if (_data.length < 4) {
                return;
            }
            let command = _data.substr(0,2);
            let value = _data.substr(4);

            // Check if we have this command in the queue
            let counter = 0;
            let found = false;
            while(counter < this._queue.length && !found) {
                found = (this._queue[counter].command == command);
                if (!found) counter++;
            }
            if (!found) {
                // We received a response to a command which is no longer in the queue!?
                this.emit("exception", {
                    toString: () => { return `Got response to command '${command}' which is not in the send queue.!?`}
                })
                return;
            }

            if (value.indexOf("=") > -1) {
                // We received an answer to a request for data
                let request = value.substr(0, value.indexOf("="));
                let answer = value.substr(value.indexOf("=")+1);
                if (this._queue[counter].cb) {
                    this._queue[counter].cb(request != this._queue[counter].value, answer);
                }
            }
            else {
                // We received an answer and it should be the same value as in the command send.
                if (command == "PS") {
                    // Print Summary.
                    this._ps = value;
                }
                if (this._queue[counter].cb) {
                    this._queue[counter].cb(value != this._queue[counter].value, value);
                }
            }

            // Remove this from the queue
            this._queue.splice(counter, 1);
        }
        else {
            if (this._ps == 1) {
                // We do not get intermediate updates only when the PS=1 command is given
                let splitData = _data.split(",");
                if (splitData.length == PRINT_SUMMARY_FIELDS.length) {
                    let printSummary = {};
                    for(var idx in PRINT_SUMMARY_FIELDS) {
                        printSummary[PRINT_SUMMARY_FIELDS[idx]] = splitData[idx];
                    }
                    this.emit("otgwData", {
                        raw: _data,
                        printSummary: printSummary
                    });
                }
                else {
                    // Wrong data from otgw
                    this.emit("inError", {
                        toString: function() { return `Received data '${_data}' from otgw has wrong number of fields. Expected '${PRINT_SUMMARY_FIELDS.length}' got '${splitData.length}.`}
                    });
                }
                return;
            }
            if (_data.length != 9) {
                if (_data.length == 2 && OTGW_RESPONSE_ERRORS[_data]) {
                    this.emit("otgwError", {
                        toString: function() { return `Received error from otgw '${_data}'='${OTGW_RESPONSE_ERRORS[_data]}'.`}
                    });
                }
                else {
                    // Wrong data from otgw
                    this.emit("inError", {
                        toString: function() { return `Received data '${_data}' from otgw has wrong length. Expected '9' got '${_data.length}.`}
                    });
                }
                return;
            }

            // Check if we can do something whith this data
            let decodedData = this.decode(_data);
            this.emit("otgwData", {
                raw: _data,
                decoded: decodedData
            });
        }
    }

    /**
     * Will send the specified command to the OTGW
     * 
     * @param {string | buffer} data 
     * @param {(error: boolean, response: string) => void} cb 
     */
    sendCommand(data, cb) {
        if (!this.connected) {
            this.emit("error", {
                toString: function() { return `Error not connected`}
            });
            if (cb) {
                cb(`Error not connected`)
            }
            return;
        }

        // Check if we have a valid otgw command
        // http://otgw.tclcode.com/firmware.html#configuration
        let _data;
        if (Buffer.isBuffer(data)) {
            _data = data.toString();
        }
        else {
            _data = data;
        }

        if (_data.length <4) {
            this.emit("error", {
                toString: function() { return `Error not a valid command '${_data}'. Not enough characters.`}
            });
            if (cb) {
                cb(`Error not a valid command '${_data}'. Not enough characters.`)
            }
            return;
        }

        if (_data[2] != "=") {
            this.emit("error", {
                toString: function() { return `Error not a valid command '${_data}'. Wrong separator. Expected '=' got '${_data[2]}'.`}
            });
            if (cb) {
                cb(`Error not a valid command '${_data}'. Wrong separator. Expected '=' got '${_data[2]}'.`)
            }
            return;
        }

        if (this._debug) console.log("openthermGateway.sendCommand:"+_data);

        let command = _data.substr(0,2);
        let value = _data.substr(3);
        if (!OTGW_COMMANDS[command]) {
            this.emit("error", {
                toString: function() { return `Error unknown command '${command}'.`}
            });
            if (cb) {
                cb(`Error unknown command '${command}'.`)
            }
            return;
        }

        if (!OTGW_COMMANDS[command].check(value)) {
            this.emit("error", {
                toString: function() { return `Error value format for command '${command}=${value}'.`}
            });
            if (cb) {
                cb(`Error value format for command '${command}=${value}'.`)
            }
            return;
        }

        var self = this;
        this._port.write(data+"\r\n", (err, bytesWritten) => {
            if (err) {
                this.emit("error", {
                    toString: function() { return `Error writing to otgw. Error: ${err.toString()}`},
                    error: err
                })
                if (cb) {
                    cb(err);
                }
            }
            else {
                // Check the response as there should always be a response.
                self._queue.push({
                    command: command,
                    value: value,
                    cb: cb
                })
            }
        });
    }

    /**
     * Will decode and check a message received from the OTGW
     * 
     * @param {string} msg
     * @returns {object}
     */
    decode(msg) {
        var result = {};

        let mparts = msg.match(/(?<status>[RBTA])(?<msgtype>..)(?<id>..)(?<val1>..)(?<val2>..)/);
        if (!mparts) {
            this.emit("error", {
                toString: () => {return `Error decoding OTGW message '${msg}'. Status is not 'R', 'B', 'T' or 'A'.`}
            })
            return;
        }

        result = {
            status: mparts.groups.status,
            direction: OTGW_DIRECTIONS[mparts.groups.status],
            msgType: mparts.groups.msgtype,
            id: mparts.groups.id,
            val1: mparts.groups.val1,
            val2: mparts.groups.val2
        }

        // Convert from hex to byte
        let val1 = parseInt("0x"+result.val1);
        let val2 = parseInt("0x"+result.val2);

        switch (result.msgType) {
            case "40": result.msgTypeStr = "Read-Ack"; break;
            case "80": result.msgTypeStr = "Read-Data"; break;
            case "C0": result.msgTypeStr = "Read-Ack"; break;
        }

        if (OPENTHERM_IDS[result.id]) {
            result.idStr = OPENTHERM_IDS[result.id]
        }
        else {
            result.idStr = "UNKNOWN-ID-"+result.id;
        }

        switch (result.id) {
            case OTGW_ID_STATUS: // Status bits
                result.Status = {};

                result.Status.FaultIndication = (val2 & 0x01) == 0x01;
                result.Status.CentralHeatingMode = (val2 & 0x02) == 0x02;
                result.Status.DomesticHotWaterMode = (val2 & 0x04) == 0x04;
                result.Status.FlameStatus = (val2 & 0x08) == 0x08;
                result.Status.CoolingStatus = (val2 & 0x10) == 0x10;
                result.Status["CH2-Enable"] = (val2 & 0x20) == 0x20;
                result.Status.DiagnosticsIndication = (val2 & 0x40) == 0x40;
                result.Status.Unknown1 = (val2 & 0x80) == 0x80;

                result.Status.CentralHeatingEnable = (val1 & 0x01) == 0x01;
                result.Status.DomesticHotwaterEnable = (val1 & 0x02) == 0x02;
                result.Status.CoolingEnable = (val1 & 0x04) == 0x04;
                result.Status["OTC-Active"] = (val1 & 0x08) == 0x08;
                result.Status["CH2-Enable"] = (val1 & 0x10) == 0x10;
                result.Status.SummerWinterMode = (val1 & 0x20) == 0x20;
                result.Status.Unknown2 = (val1 & 0x40) == 0x40;
                result.Status.Unknown3 = (val1 & 0x80) == 0x80;

                result.StatusStr = {};

                result.StatusStr.FaultIndication = result.Status.FaultIndication ? "Fault" : "No fault";
                result.StatusStr.CentralHeatingMode = result.Status.CentralHeatingMode ? "Active" : "Not active";
                result.StatusStr.DomesticHotWaterMode = result.Status.DomesticHotWaterMode ? "Active" : "Not active";
                result.StatusStr.FlameStatus = result.Status.FlameStatus ? "Flame on" : "Flame off";
                result.StatusStr.CoolingStatus = result.Status.CoolingStatus ? "Active" : "Not active";
                result.StatusStr["CH2-Enable"] = result.Status["CH2-Enable"] ? "Enabled" : "Disabled";
                result.StatusStr.DiagnosticsIndication = result.Status.DiagnosticsIndication ? "Diagnostic event" : "No diagnostics";

                result.StatusStr.CentralHeatingEnable = result.Status.CentralHeatingEnable ? "Enabled" : "Disabled";
                result.StatusStr.DomesticHotwaterEnable = result.Status.DomesticHotwaterEnable ? "Enabled" : "Disabled";
                result.StatusStr.CoolingEnable = result.Status.CoolingEnable ? "Enabled" : "Disabled";
                result.StatusStr["OTC-Active"] = result.Status["OTC-Active"] ? "Active" : "Not active";
                result.StatusStr["CH2-Enable"] = result.Status["CH2-Enable"] ? "Enabled" : "Disabled";
                result.StatusStr.SummerWinterMode = result.Status.SummerWinterMode ? "Summer" : "Winter";
                break;
            case OTGW_ID_CONTROLSETPOINT:
            case OTGW_ID_COOLINGCONTROLSIGNAL:
            case OTGW_ID_CH2CONTROLSETPOINT:
            case OTGW_ID_REMOTEOVERRIDEROOMSETPOINT:
            case OTGW_ID_MAXRELATIVEMODULATIONLEVEL:
            case OTGW_ID_ROOMSETPOINT:
            case OTGW_ID_RELATIVEMODULATIONLEVEL:
            case OTGW_ID_CH_WATERPRESSURE:
            case OTGW_ID_DHWFLOWRATE:
            case OTGW_ID_DAYTIME:
            case OTGW_ID_DATE:
            case OTGW_ID_YEAR:
            case OTGW_ID_CH2CURRENTSETPOINT:
            case OTGW_ID_CURRENTTEMPERATURE:
            case OTGW_ID_BOILERWATERTEMPERATURE:
            case OTGW_ID_DHWTEMPERATURE:
            case OTGW_ID_OUTSIDETEMPERATURE:
            case OTGW_ID_RETURNWATERTEMPERATURE:
            case OTGW_ID_SOLARCOLLECTORTEMPERATURE:
            case OTGW_ID_SOLARSTORAGETEMPERATURE:
            case OTGW_ID_CH2FLOWTEMPERATURE:
            case OTGW_ID_DHW2TEMPERATURE:
            case OTGW_ID_BOILEREXHAUSTTEMPERATURE:
            case OTGW_ID_DHWBOUNADRIES:
            case OTGW_ID_CHBOUNDARIES:
            case OTGW_ID_OTCBOUNDARIES:
            case OTGW_ID_DHWSETPOINT:
            case OTGW_ID_MAXCHWATERSETPOINT_39:
            case OTGW_ID_MAXCHWATERSETPOINT_3A:
            case OTGW_ID_OTCHEATCURVERATIO:
            case OTGW_ID_STARTSBURNER:
            case OTGW_ID_STARTSBURNERDHW_77:
            case OTGW_ID_STARTSBURNERDHW_78:
            case OTGW_ID_STARTSCHPUMP:
            case OTGW_ID_STARTSHDWPUMP:
            case OTGW_ID_HOURSCHPUMP_79:
            case OTGW_ID_HOURSCHPUMP_7A:
            case OTGW_ID_HOURSPUMPDHW:
            case OTGW_ID_MASTEROPENTHERMVERSION:
            case OTGW_ID_SLAVEOPENTHERMVERSION:
                result[result.idStr] = toFloat(val1, val2);
                break;
            case OTGW_ID_MASTERMEMBERID:
            case OTGW_ID_SLAVEMEMBERID:
            case OTGW_ID_FAULTCODE:
            case OTGW_ID_TSPNUMBER:
            case OTGW_ID_FHBSIZE:
                result[result.idStr] = val1;
                break;
            case OTGW_ID_TSPINDEXANDTSPVALUE:
            case OTGW_ID_FHBINDEXANDFHBVALUE:
                result[result.idStr] = {
                    index: val1,
                    value: val2
                };
                break;
            case OTGW_ID_BOILERCAPACITYANDMODULATIONLIMITS:
                result[result.idStr] = {
                    capacity: val1,
                    modulationlimit: val2
                };
                break;
            case OTGW_ID_MASTERPRODUCTTYPEANDVERSION:
            case OTGW_ID_SLAVEPRODUCTTYPEANDVERSION:
                result[result.idStr] = {
                    productiontype: val1,
                    version: val2
                };
                break;
            default:
                result[result.idStr] = {
                    val1: val1,
                    val2: val2,
                    float: toFloat(val1, val2)
                }
                break;
        }

        if (!this._data[result.status]) {
            this._data[result.status] = {};
        }
        this._data[result.status][result.idStr] = result[result.idStr];
        if (result.id == OTGW_ID_STATUS) {
            this._data[result.status].StatusStr = result.StatusStr;
        }

        return result;
    }

    close(cb) {
        if (this.connected) {
            this._port.close(cb);
        }
    }
}

module.exports = function(serialDevice, serialOptions, otgwOptions) {
    return new openthermGatway(serialDevice, serialOptions, otgwOptions);
}
