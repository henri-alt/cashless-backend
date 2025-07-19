function toCamel(str: string) {
  if (!str || "string" !== typeof str) {
    return "";
  }

  return str.replace(
    /(^[A-Z])|(\s\w{1})/g,
    function (match: string, g1: string | undefined, g2: string | undefined) {
      if (g1) {
        return g1.toLocaleLowerCase();
      } else if (g2) {
        return g2.toUpperCase().slice(1);
      }

      return match;
    }
  );
}

export default toCamel;
