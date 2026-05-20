import logging
import os
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

ZEEK_FIELDS = {
    "conn": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "proto", "service", "duration", "orig_bytes", "resp_bytes",
        "conn_state", "local_orig", "local_resp", "missed_bytes",
        "history", "orig_pkts", "orig_ip_bytes", "resp_pkts", "resp_ip_bytes"
    },
    "dns": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "proto", "trans_id", "rtt", "query", "qclass", "qclass_name",
        "qtype", "qtype_name", "rcode", "rcode_name", "AA", "TC", "RD",
        "RA", "Z", "answers", "TTLs", "rejected"
    },
    "http": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "trans_depth", "method", "host", "uri", "version",
        "user_agent", "request_body_len", "response_body_len",
        "status_code", "status_msg", "resp_fuids"
    },
    "ssl": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "version", "cipher", "curve", "server_name", "resumed",
        "last_alert", "subject", "issuer", "validation_status",
        "ja3", "ja3s"
    },
    "weird": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "name", "addl", "source"
    },
    "notice": {
        "ts", "uid", "id.orig_h", "id.orig_p", "id.resp_h", "id.resp_p",
        "note", "msg", "sub", "src", "dst", "p"
    }
}

NUMERIC_CONVERSIONS = {
    "conn": {
        "duration": "float64",
        "orig_bytes": "float64",
        "resp_bytes": "float64",
        "orig_pkts": "float64",
        "resp_pkts": "float64",
        "id.orig_p": "float64",
        "id.resp_p": "float64"
    },
    "dns": {
        "rtt": "float64",
        "qclass": "float64",
        "qtype": "float64",
        "rcode": "float64",
        "id.orig_p": "float64",
        "id.resp_p": "float64"
    },
    "http": {
        "request_body_len": "float64",
        "response_body_len": "float64",
        "status_code": "float64",
        "id.orig_p": "float64",
        "id.resp_p": "float64"
    },
    "ssl": {
        "id.orig_p": "float64",
        "id.resp_p": "float64"
    }
}


def parse_zeek_log(filepath: str, log_type: str) -> Optional[pd.DataFrame]:
    if not os.path.isfile(filepath):
        logger.warning("Log file not found: %s", filepath)
        return None

    separator = "\t"
    comment_char = "#"
    header_lines = []
    data_lines = []

    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith(comment_char):
                header_lines.append(line)
            elif line:
                data_lines.append(line)

    field_names = None
    for hl in header_lines:
        if hl.startswith("#fields"):
            field_names = hl.split("\t")[1:]
            break

    if field_names is None or len(data_lines) == 0:
        logger.warning("No data found in %s", filepath)
        return None

    rows = []
    for dl in data_lines:
        fields = dl.split(separator)
        if len(fields) == len(field_names):
            rows.append(fields)
        else:
            logger.debug("Skipping malformed line in %s", log_type)

    df = pd.DataFrame(rows, columns=field_names)

    expected_fields = ZEEK_FIELDS.get(log_type, set())
    available_fields = [c for c in df.columns if c in expected_fields]
    df = df[available_fields]

    conversions = NUMERIC_CONVERSIONS.get(log_type, {})
    for col, dtype in conversions.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "ts" in df.columns:
        df["ts"] = pd.to_numeric(df["ts"], errors="coerce")

    replace_dashes = df.columns.difference(["ts"])
    for col in replace_dashes:
        if df[col].dtype == object:
            df[col] = df[col].replace("-", pd.NA)

    logger.info("Parsed %s: %d rows, %d columns", log_type, len(df), len(df.columns))
    return df


def parse_all_logs(log_paths: dict) -> dict:
    logs = {}
    for log_type, path in log_paths.items():
        df = parse_zeek_log(path, log_type)
        if df is not None:
            logs[log_type] = df
        else:
            logger.warning("Failed to parse %s log", log_type)
    return logs