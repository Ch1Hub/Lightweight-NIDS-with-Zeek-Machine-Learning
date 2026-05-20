@load base/protocols/conn
@load base/protocols/dns
@load base/protocols/http
@load base/protocols/ssl
@load base/frameworks/notice
@load base/frameworks/weird

event zeek_init()
    {
    local conn_filter = Log::create_filter(IDR_CONN_INFO);
    conn_filter$path = "conn";
    conn_filter$incl = vector(
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "proto", "service", "duration", "orig_bytes", "resp_bytes",
        "conn_state", "local_orig", "local_resp", "missed_bytes",
        "history", "orig_pkts", "orig_ip_bytes", "resp_pkts", "resp_ip_bytes"
    );
    Log::add_filter(Conn::LOG, conn_filter);

    local dns_filter = Log::create_filter(IDR_DNS_INFO);
    dns_filter$path = "dns";
    dns_filter$incl = vector(
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "proto", "trans_id", "rtt", "query", "qclass", "qclass_name",
        "qtype", "qtype_name", "rcode", "rcode_name", "AA", "TC", "RD",
        "RA", "Z", "answers", "TTLs", "rejected"
    );
    Log::add_filter(DNS::LOG, dns_filter);

    local http_filter = Log::create_filter(IDR_HTTP_INFO);
    http_filter$path = "http";
    http_filter$incl = vector(
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "trans_depth", "method", "host", "uri", "version",
        "user_agent", "request_body_len", "response_body_len",
        "status_code", "status_msg", "resp_fuids"
    );
    Log::add_filter(HTTP::LOG, http_filter);

    local ssl_filter = Log::create_filter(IDR_SSL_INFO);
    ssl_filter$path = "ssl";
    ssl_filter$incl = vector(
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "version", "cipher", "curve", "server_name", "resumed",
        "last_alert", "subject", "issuer", "validation_status",
        "ja3", "ja3s"
    );
    Log::add_filter(SSL::LOG, ssl_filter);
    }