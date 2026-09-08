import { Bonjour } from "bonjour-service";
import dgram from "node:dgram";
import { networkInterfaces } from "node:os";
import { privateHost, type Discovery } from "../shared/protocol";
const DISCOVERY_PORT = 45701;
export function addresses() {
  return Object.entries(networkInterfaces()).flatMap(([name, items]) =>
    (items ?? [])
      .filter(
        (i) => i.family === "IPv4" && !i.internal && privateHost(i.address),
      )
      .map((i) => ({ name, address: i.address })),
  );
}
export function advertise(port: number) {
  const bonjour = new Bonjour(undefined, () => {});
  const service = bonjour.publish({
    name: "LOCAL_CLASSROOM_TEACHER",
    type: "localclassroom",
    port,
    txt: { protocolVersion: "1" },
  });
  service.on("error", () => {});
  const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
  udp.on("error", () => {});
  udp.on("message", (msg, remote) => {
    if (
      msg.toString() === "LOCAL_CLASSROOM_DISCOVER_V1" &&
      privateHost(remote.address)
    )
      udp.send(
        JSON.stringify({
          service: "LOCAL_CLASSROOM_TEACHER",
          protocolVersion: 1,
          port,
        }),
        remote.port,
        remote.address,
      );
  });
  udp.bind(DISCOVERY_PORT);
  return () => {
    service.stop();
    bonjour.destroy();
    try {
      udp.close();
    } catch {}
  };
}
export async function discover(): Promise<Discovery[]> {
  const found = new Map<string, Discovery>();
  const bonjour = new Bonjour(undefined, () => {});
  const browser = bonjour.find({ type: "localclassroom" }, (service) => {
    if (service.txt?.protocolVersion === "1")
      for (const address of service.addresses ?? [])
        if (privateHost(address))
          found.set(address, { address, port: service.port, source: "mDNS" });
  });
  const udp = dgram.createSocket("udp4");
  udp.on("error", () => {});
  udp.on("message", (msg, r) => {
    try {
      const data = JSON.parse(msg.toString());
      if (
        data.service === "LOCAL_CLASSROOM_TEACHER" &&
        data.protocolVersion === 1 &&
        Number.isInteger(data.port) &&
        data.port >= 1024 &&
        data.port <= 65535 &&
        privateHost(r.address)
      )
        found.set(r.address, {
          address: r.address,
          port: data.port,
          source: "UDP",
        });
    } catch {}
  });
  udp.bind(0, () => {
    udp.setBroadcast(true);
    udp.send("LOCAL_CLASSROOM_DISCOVER_V1", DISCOVERY_PORT, "255.255.255.255");
  });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  browser.stop();
  bonjour.destroy();
  udp.close();
  return [...found.values()];
}
