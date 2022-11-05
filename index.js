const {LocationClient, CalculateRouteCommand} = require("@aws-sdk/client-location");
const {InfluxDB, Point} = require("@influxdata/influxdb-client");


exports.handler = function(event) {

    const awsLocationClient = new LocationClient({
        region: 'eu-west-1'
    });

    const influxConfig = require("./influx_db.json");
    const influxWriteApi = new InfluxDB({url: influxConfig.url, token: influxConfig.token})
        .getWriteApi(influxConfig.org, influxConfig.bucket);
    const truckOrders = event;

    /*
    {
       "CarModeOptions": {
          "AvoidFerries": boolean,
          "AvoidTolls": boolean
       },
       "DepartNow": boolean,
       "DeparturePosition": [ number ],
       "DepartureTime": number,
       "DestinationPosition": [ number ],
       "DistanceUnit": "string",
       "IncludeLegGeometry": boolean,
       "TravelMode": "string",
       "TruckModeOptions": {
          "AvoidFerries": boolean,
          "AvoidTolls": boolean,
          "Dimensions": {
             "Height": number,
             "Length": number,
             "Unit": "string",
             "Width": number
          },
          "Weight": {
             "Total": number,
             "Unit": "string"
          }
       },
       "WaypointPositions": [
          [ number ]
       ]
    }
     */
    for (const truckId in truckOrders) {
        let truckOrder = truckOrders[truckId];
        let departurePosition = truckOrder[0].reverse();
        let destinationPosition = truckOrder[truckOrder.length - 1].reverse();
        let waypoints = truckOrder.slice(1, truckOrder.length - 1).map(arr => arr.reverse());
        const calculateRouteParams = {
            "CalculatorName": "HackatonTruckRouteCalculator_Here",
            "DeparturePosition": departurePosition,
            "DestinationPosition": destinationPosition,
            "IncludeLegGeometry": true,
            "WaypointPositions": waypoints,
        }
        const command = new CalculateRouteCommand(calculateRouteParams);
        awsLocationClient.send(command).then((data) => {
                let startTime = new Date();
                data.Legs.forEach((leg) => processLeg(leg, truckId, startTime));
                influxWriteApi.close().then(() => console.log(`Route saved for truck #${truckId}`))
                    .catch((error) => console.log(error));

            }
        ).catch((error) => console.log(error));
    }

    function processLeg(leg, truckId, startTime) {
        let eta = startTime;
        for (const step in leg.Steps) {
            eta = processStep(leg.Steps[step], truckId, eta);
        }
    }

    function processStep(step, truckId, startTime = new Date()) {

        let start = step.StartPosition.reverse();
        let end = step.EndPosition.reverse();
        let eta = new Date(startTime.getTime() + step.DurationSeconds * 1000);

        writeData({start, end, startTime, truckId, eta});
        return eta;
    }

    function writeData(data) {

        let points = [
            new Point('route')
                .floatField('lat', data.start[0])
                .floatField('lon', data.start[1])
                .tag('id', data.truckId)
                .timestamp(data.startTime),
            new Point('route')
                .floatField('lat', data.end[0])
                .floatField('lon', data.end[1])
                .tag('id', data.truckId)
                .timestamp(data.eta)
        ];
        influxWriteApi.writePoints(points);
    }
}
