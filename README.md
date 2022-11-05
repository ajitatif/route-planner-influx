# Route Planner Lambda

A super simple route planner lambda function using AWS 
Location Services. After the route calculation, it writes
the route into InfluxDB provided with the configuration

## Installing

Magic!
```shell
yarn
```

## Configuration

You'll need a `influx_db.json` in the source directory

```json
{
  "url": <http_url>,
  "token": <token>,
  "org": <org>,
  "username": <username>,
  "password": <password>,
  "bucket": <bucket>
}
```
## Deployment

Nothing fancy, just zip the directory and upload using
AWS console

```shell
zip -r route-planner.zip . -x@.zipignore
```

## How to Run

The lambda expects a tidy map of truck-to-point_array:

```json
{
  "truck-01": [[52.50801,13.43375], [48.87324,2.77594]]
}
```

The points are in `[latitude, longitude]` order. 
You can add more than two points for route planning

## License

GPLv3, and beyond
