import gzip
import re
from datetime import datetime
import json
from collections import defaultdict, Counter
import argparse
import os

class NginxLogParser:
    def __init__(self, log_file):
        self.log_file = log_file
        self.log_pattern = r'(?P<ip>[\d\.]+) - - \[(?P<datetime>[^\]]+)\] "(?P<request>[^"]*)" (?P<status>\d+) (?P<bytes>\d+) "(?P<referrer>[^"]*)" "(?P<user_agent>[^"]*)"'
        self.log_regex = re.compile(self.log_pattern)
        self.parsed_logs = []
        self.stats = {
            'total_requests': 0,
            'status_codes': Counter(),
            'ip_addresses': Counter(),
            'user_agents': Counter(),
            'requests_per_hour': defaultdict(int),
            'endpoints': Counter(),
            'bytes_transferred': 0
        }

    def parse_request(self, request_str):
        try:
            parts = request_str.split()
            if len(parts) >= 2:
                method = parts[0]
                path = parts[1]
                protocol = parts[2] if len(parts) > 2 else ""
                return {
                    'method': method,
                    'path': path,
                    'protocol': protocol
                }
            return {'method': '', 'path': '', 'protocol': ''}
        except Exception:
            return {'method': '', 'path': '', 'protocol': ''}

    def parse_logs(self):
        if self.log_file.endswith('.gz'):
            opener = gzip.open
        else:
            opener = open

        with opener(self.log_file, 'rt', encoding='utf-8', errors='ignore') as f:
            for line in f:
                match = self.log_regex.match(line.strip())
                if match:
                    log_entry = match.groupdict()
                    
                    # Parse request string
                    request_parts = self.parse_request(log_entry['request'])
                    log_entry.update(request_parts)
                    
                    # Convert datetime string to datetime object
                    try:
                        dt_str = log_entry['datetime']
                        dt = datetime.strptime(dt_str, '%d/%b/%Y:%H:%M:%S %z')
                        log_entry['datetime_obj'] = dt
                        log_entry['hour'] = f"{dt.year}-{dt.month:02d}-{dt.day:02d} {dt.hour:02d}:00"
                    except Exception:
                        log_entry['datetime_obj'] = None
                        log_entry['hour'] = "unknown"
                    
                    # Convert numeric fields
                    log_entry['status'] = int(log_entry['status'])
                    log_entry['bytes'] = int(log_entry['bytes'])
                    
                    self.parsed_logs.append(log_entry)
                    
                    # Update statistics
                    self.stats['total_requests'] += 1
                    self.stats['status_codes'][log_entry['status']] += 1
                    self.stats['ip_addresses'][log_entry['ip']] += 1
                    self.stats['user_agents'][log_entry['user_agent']] += 1
                    self.stats['requests_per_hour'][log_entry['hour']] += 1
                    self.stats['endpoints'][log_entry['path']] += 1
                    self.stats['bytes_transferred'] += log_entry['bytes']
        
        return self.parsed_logs
    
    def get_statistics(self):
        """Return statistics about the logs."""
        if not self.parsed_logs:
            self.parse_logs()
            
        # Calculate additional statistics
        stats = self.stats.copy()
        
        # Convert Counters to sorted lists for better readability
        stats['top_ips'] = stats['ip_addresses'].most_common(10)
        stats['top_user_agents'] = stats['user_agents'].most_common(10)
        stats['top_endpoints'] = stats['endpoints'].most_common(10)
        stats['status_distribution'] = dict(stats['status_codes'])
        
        # Calculate requests per hour for time series
        hours_sorted = sorted(stats['requests_per_hour'].items())
        stats['requests_timeline'] = hours_sorted
        
        # Calculate total transferred data in MB
        stats['total_transferred_mb'] = stats['bytes_transferred'] / (1024 * 1024)
        
        return stats
    
    def export_json(self, output_file='parsed_logs.json'):
        """Export parsed logs to a JSON file."""
        if not self.parsed_logs:
            self.parse_logs()
            
        # Convert datetime objects to strings for JSON serialization
        serializable_logs = []
        for log in self.parsed_logs:
            log_copy = log.copy()
            if log_copy['datetime_obj']:
                log_copy['datetime_obj'] = log_copy['datetime_obj'].isoformat()
            serializable_logs.append(log_copy)
            
        with open(output_file, 'w') as f:
            json.dump(serializable_logs, f, indent=2)
        
        return output_file
    
    def export_stats_json(self, output_file='log_stats.json'):
        """Export statistics to a JSON file."""
        stats = self.get_statistics()
        
        # Make the stats JSON serializable
        serializable_stats = {}
        for key, value in stats.items():
            if isinstance(value, Counter):
                serializable_stats[key] = dict(value)
            elif isinstance(value, defaultdict):
                serializable_stats[key] = dict(value)
            else:
                serializable_stats[key] = value
        
        with open(output_file, 'w') as f:
            json.dump(serializable_stats, f, indent=2)
        
        return output_file

def main():
    parser = argparse.ArgumentParser(description='Parse NGINX access logs')
    parser.add_argument('log_file', help='Path to the NGINX access log file (can be gzipped)')
    parser.add_argument('--output', '-o', help='Output JSON file for parsed logs', default='parsed_logs.json')
    parser.add_argument('--stats', '-s', help='Output JSON file for statistics', default='log_stats.json')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.log_file):
        print(f"Error: Log file '{args.log_file}' not found")
        return
    
    log_parser = NginxLogParser(args.log_file)
    parsed_logs = log_parser.parse_logs()
    
    print(f"Parsed {len(parsed_logs)} log entries")
    
    if args.output:
        output_file = log_parser.export_json(args.output)
        print(f"Saved parsed logs to {output_file}")
    
    if args.stats:
        stats_file = log_parser.export_stats_json(args.stats)
        print(f"Saved statistics to {stats_file}")
    
    # Print some basic statistics
    stats = log_parser.get_statistics()
    print(f"\nBasic Statistics:")
    print(f"Total Requests: {stats['total_requests']}")
    print(f"Total Data Transferred: {stats['total_transferred_mb']:.2f} MB")
    print(f"\nStatus Code Distribution:")
    for status, count in sorted(stats['status_distribution'].items()):
        print(f"  {status}: {count} ({count/stats['total_requests']*100:.1f}%)")
    
    print(f"\nTop 5 Endpoints:")
    for endpoint, count in stats['top_endpoints'][:5]:
        print(f"  {endpoint}: {count}")

if __name__ == "__main__":
    main()