// https://docs.oracle.com/javase/8/docs/api/java/util/Base64.html
let JavaString = Java.type("java.lang.String");
let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
let Charset = Java.type('java.nio.charset.Charset');
let Base64 = Java.type("java.util.Base64");

// prettier-ignore
let getBytesMethod = Java.type("java.lang.String").class.getDeclaredMethod("getBytes", Charset.class);

export let atob = base64 => {
  let decoder = Base64.getDecoder();
  let bytes = decoder.decode(base64);
  return new JavaString(bytes, StandardCharsets.UTF_8);
};

export let btoa = string => {
  let decoder = Base64.getEncoder();
  console.log('x')
  let bytes = getBytesMethod.invoke(string, StandardCharsets.UTF_8);
  console.log('y');
  return decoder.encodeToString(bytes);
};
