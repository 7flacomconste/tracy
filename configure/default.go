package configure

/*DefaultConfig is the default configuration that is used when a configuration file is not found. */
const DefaultConfig = `{
  "tracers": {
    "zzPLAINzz": "[[ID]]",
    "zzXSSzz": "\\\"'<[[ID]]>",
    "GEN-XSS": "\\\"'<[[ID]]>",
    "GEN-PLAIN": "[[ID]]"
   },
  "default-tracer": "zzPLAINzz",
  "server-whitelist": [
  	"localhost:8081",
    "127.0.0.1:8081",
    "localhost:3000",
    "127.0.0.1:3000",
    "127.0.0.1:6001",
    "localhost:6001"
  ],
  "tracer-server": "127.0.0.1:8081",
  "proxy-server": "127.0.0.1:7777",
  "auto-fill": false,
  "auto-launch": "default",
  "public-key-loc": "%s",
  "private-key-loc": "%s",
  "version": "0.1"
}`
