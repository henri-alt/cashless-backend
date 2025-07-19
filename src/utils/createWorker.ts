import cluster from "cluster";

function createWorker() {
  const worker = cluster.fork();
  worker.on("message", function (message) {
    for (const worker of Object.values(cluster.workers)) {
      worker.send(message);
    }
  });

  return worker;
}

export default createWorker;
