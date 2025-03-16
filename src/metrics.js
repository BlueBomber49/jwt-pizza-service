const config = require("./config");

let requests = {}

const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return parseInt(cpuUsage.toFixed(2) * 100);
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return parseInt(memoryUsage);
}

class Metrics {
  constructor(){
    this.getRequests = 0
    this.putRequests = 0
    this.postRequests = 0
    this.deleteRequests = 0
    this.cpuValue = 0
    this.memoryValue = 0
    this.activeUsers = 0  //?
    this.failedAuthAttempts = 0
    this.successfulAuthAttempts = 0
    this.pizzasSold = 0
    this.pizzaCreationFailures = 0
    this.revenueEarned = 0
    this.endpointLatency = 0  //?
    this.pizzaCreationLatency = 0  //?
  }

  sendMetricsPeriodically(period) {
    setInterval(() => {
      this.getCpu()
      sendMetricToGrafana("cpu", this.cpuValue, "gauge", "%");
  
      this.getMemory()
      sendMetricToGrafana("memory", this.memoryValue, "gauge", "%");

      this.sendHTTPMetricsToGrafana()

      this.sendAuthMetricsToGrafana()
  
    }, period).unref();
  }

  sendHTTPMetricsToGrafana(){
    sendMetricToGrafana("get requests", this.getRequests, "sum", "1")
    this.getRequests = 0
    sendMetricToGrafana("put requests", this.putRequests, "sum", "1")
    this.putRequests = 0
    sendMetricToGrafana("post requests", this.postRequests, "sum", "1")
    this.postRequests = 0
    sendMetricToGrafana("delete requests", this.deleteRequests, "sum", "1")
    this.deleteRequests = 0
  }

  sendAuthMetricsToGrafana(){
    this.sendMetricToGrafana("successful logins", this.successfulAuthAttempts, "sum", "1")
    this.successfulAuthAttempts = 0
    this.sendMetricToGrafana("unsuccessful logins", this.failedAuthAttempts, "sum", "1")
    this.failedAuthAttempts = 0
  }

  incrementGetRequests(){
    this.getRequests += 1
  }

  incrementPutRequests(){
    this.putRequests += 1
  }

  incrementPostRequests(){
    this.postRequests += 1
  }

  incrementDeleteRequests(){
    this.deleteRequests += 1
  }

  incrementSuccessfulAuthAttempts(){
    this.successfulAuthAttempts +=1
  }

  incrementFailedAuthAttempts(){
    this.failedAuthAttempts +=1
  }

  getCpu(){
    this.cpuValue = getCpuUsagePercentage()
  }

  getMemory(){
    this.memoryValue = getMemoryUsagePercentage()
  }

  incrementPizzasSold(){
    this.pizzasSold +=1
  }

  addRevenue(value){
    this.trackRevenue += value
  }
}

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [              
              {
              name: metricName,
              unit: unit,
              [type]: {
                dataPoints: [
                  {
                    asInt: metricValue,
                    timeUnixNano: Date.now() * 1000000,
                  },
                ],
              },
            },
            ],
          },
        ],
      },
    ],
  };

  if (type === "sum") {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][
      type
    ].aggregationTemporality = "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][
      type
    ].isMonotonic = true;
  }

  const body = JSON.stringify(metric);

  //Send the metrics to grafana
  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: body,
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(
            `Failed to push metrics data to Grafana: ${text}\n${body}`
          );
        });
      } else {
        //console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = new Metrics()

//sendMetricsPeriodically(1000)