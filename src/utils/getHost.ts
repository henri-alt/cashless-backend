import address from "address";

export default function getHost() {
  let host: string;
  address((error, address) => {
    if (error) {
      throw error;
    }

    host = address.ip || "127.0.0.1";
  });

  return host;
}
