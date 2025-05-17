import gzip
import re
from datetime import datetime, timezone
import json
from collections import defaultdict, Counter
import argparse
import os
import ipaddress
from urllib.parse import urlparse

class NginxLogParser:
    def __init__(self, log_file):
        self.log_file = log_file
        self.log_pattern = r'(?P<ip>[\d\.]+) - - \[(?P<datetime>[^\]]+)\] "(?P<request>[^"]*)" (?P<status>\d+) (?P<bytes>\d+) "(?P<referrer>[^"]*)" "(?P<user_agent>[^"]*)"'
        self.log_regex = re.compile(self.log_pattern)
        self.parsed_logs = []
        
        # Common bot patterns in user agents
        self.bot_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in [
                r'bot', r'spider', r'crawl', r'slurp', r'scraper', r'fetcher',
                r'archiver', r'validator', r'baidu', r'pingdom', r'scanner',
                r'http[s]?-client', r'curl', r'wget', r'monitor', r'health-check',
                r'gptbot', r'claudebot', r'anthropic', r'openai', r'googlebot',
                r'bingbot', r'yandexbot', r'duckduckbot'
            ]
        ]
        
        # Initialize statistics
        self.stats = {
            'total_requests': 0,
            'status_codes': Counter(),
            'ip_addresses': Counter(),
            'user_agents': Counter(),
            'requests_per_hour': defaultdict(int),
            'requests_per_day': defaultdict(int),
            'endpoints': Counter(),
            'bytes_transferred': 0,
            'http_methods': Counter(),
            'bot_requests': 0,
            'user_requests': 0,
            'response_times': [],  # If available in logs
            'file_types': Counter(),
            'referers': Counter(),
            'path_depth': Counter(),
            'protocol_versions': Counter(),
            'timezone_distribution': Counter(),
            'error_requests': 0,
            'success_requests': 0,
            'redirect_requests': 0,
            'client_error_requests': 0,
            'server_error_requests': 0,
            'traffic_per_hour': defaultdict(int),  # bytes
            'top_error_paths': Counter(),
            'ip_classification': {
                'private': 0,
                'public': 0,
                'loopback': 0,
                'other': 0
            }
        }

    def is_bot(self, user_agent):
        """Determine if a user agent is a bot"""
        if not user_agent or user_agent == '-':
            return False
            
        return any(pattern.search(user_agent) for pattern in self.bot_patterns)
    
    def classify_ip(self, ip):
        """Classify an IP address as private, public, loopback, or other"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            if ip_obj.is_private:
                return 'private'
            elif ip_obj.is_global:
                return 'public'
            elif ip_obj.is_loopback:
                return 'loopback'
            else:
                return 'other'
        except ValueError:
            return 'invalid'
    
    def get_file_extension(self, path):
        """Extract file extension from path"""
        if not path or path == '/' or path == '-':
            return 'no_extension'
            
        # Parse URL path
        parsed_path = urlparse(path).path
        
        # Extract the file extension
        _, ext = os.path.splitext(parsed_path)
        if ext:
            return ext.lower()[1:]  # Remove the leading dot
        return 'no_extension'
    
    def get_path_depth(self, path):
        """Calculate the depth of a URL path"""
        if not path or path == '-':
            return 0
            
        # Parse URL path
        parsed_path = urlparse(path).path
        
        # Count path segments
        segments = [s for s in parsed_path.split('/') if s]
        return len(segments)
    
    def parse_request(self, request_str):
        try:
            parts = request_str.split()
            if len(parts) >= 2:
                method = parts[0]
                path = parts[1]
                protocol = parts[2] if len(parts) > 2 else ""
                
                # Extract additional information
                file_extension = self.get_file_extension(path)
                path_depth = self.get_path_depth(path)
                
                return {
                    'method': method,
                    'path': path,
                    'protocol': protocol,
                    'file_extension': file_extension,
                    'path_depth': path_depth
                }
            return {'method': '', 'path': '', 'protocol': '', 'file_extension': '', 'path_depth': 0}
        except Exception:
            return {'method': '', 'path': '', 'protocol': '', 'file_extension': '', 'path_depth': 0}

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
                        log_entry['day'] = f"{dt.year}-{dt.month:02d}-{dt.day:02d}"
                        log_entry['timezone'] = str(dt.tzinfo)
                    except Exception:
                        log_entry['datetime_obj'] = None
                        log_entry['hour'] = "unknown"
                        log_entry['day'] = "unknown"
                        log_entry['timezone'] = "unknown"
                    
                    # Convert numeric fields
                    log_entry['status'] = int(log_entry['status'])
                    log_entry['bytes'] = int(log_entry['bytes'])
                    
                    # Classify bot vs user
                    log_entry['is_bot'] = self.is_bot(log_entry['user_agent'])
                    
                    # Classify IP address
                    log_entry['ip_class'] = self.classify_ip(log_entry['ip'])
                    
                    # Add to parsed logs
                    self.parsed_logs.append(log_entry)
                    
                    # Update statistics
                    self.stats['total_requests'] += 1
                    self.stats['status_codes'][log_entry['status']] += 1
                    self.stats['ip_addresses'][log_entry['ip']] += 1
                    self.stats['user_agents'][log_entry['user_agent']] += 1
                    self.stats['requests_per_hour'][log_entry['hour']] += 1
                    self.stats['requests_per_day'][log_entry['day']] += 1
                    self.stats['endpoints'][log_entry['path']] += 1
                    self.stats['bytes_transferred'] += log_entry['bytes']
                    self.stats['http_methods'][log_entry['method']] += 1
                    self.stats['file_types'][log_entry['file_extension']] += 1
                    self.stats['path_depth'][log_entry['path_depth']] += 1
                    self.stats['protocol_versions'][log_entry['protocol']] += 1
                    self.stats['timezone_distribution'][log_entry['timezone']] += 1
                    self.stats['traffic_per_hour'][log_entry['hour']] += log_entry['bytes']
                    
                    # Process referrer if not empty
                    if log_entry['referrer'] and log_entry['referrer'] != '-':
                        self.stats['referers'][log_entry['referrer']] += 1
                    
                    # Classify as bot or user
                    if log_entry['is_bot']:
                        self.stats['bot_requests'] += 1
                    else:
                        self.stats['user_requests'] += 1
                    
                    # Classify by status code
                    status = log_entry['status']
                    if 200 <= status < 300:
                        self.stats['success_requests'] += 1
                    elif 300 <= status < 400:
                        self.stats['redirect_requests'] += 1
                    elif 400 <= status < 500:
                        self.stats['client_error_requests'] += 1
                        self.stats['error_requests'] += 1
                        self.stats['top_error_paths'][log_entry['path']] += 1
                    elif 500 <= status < 600:
                        self.stats['server_error_requests'] += 1
                        self.stats['error_requests'] += 1
                        self.stats['top_error_paths'][log_entry['path']] += 1
                    
                    # Update IP classification
                    self.stats['ip_classification'][log_entry['ip_class']] += 1
        
        return self.parsed_logs
    
    def get_statistics(self):
        """Return statistics about the logs."""
        if not self.parsed_logs:
            self.parse_logs()
            
        # Calculate additional statistics
        stats = self.stats.copy()
        
        # Convert Counters to sorted lists for better readability
        stats['top_ips'] = stats['ip_addresses'].most_common(50)
        stats['top_user_agents'] = stats['user_agents'].most_common(30)
        stats['top_endpoints'] = stats['endpoints'].most_common(50)
        stats['top_file_types'] = stats['file_types'].most_common(20)
        stats['top_referers'] = stats['referers'].most_common(20)
        stats['top_http_methods'] = stats['http_methods'].most_common(10)
        stats['path_depth_distribution'] = sorted(dict(stats['path_depth']).items())
        stats['status_distribution'] = dict(stats['status_codes'])
        stats['protocol_distribution'] = dict(stats['protocol_versions'])
        
        # Calculate requests per hour and day for time series
        stats['requests_timeline'] = sorted(stats['requests_per_hour'].items())
        stats['daily_requests'] = sorted(stats['requests_per_day'].items())
        
        # Calculate traffic per hour in MB
        traffic_per_hour_mb = {hour: bytes_count/(1024*1024) for hour, bytes_count in stats['traffic_per_hour'].items()}
        stats['traffic_timeline_mb'] = sorted(traffic_per_hour_mb.items())
        
        # Calculate total transferred data in MB
        stats['total_transferred_mb'] = stats['bytes_transferred'] / (1024 * 1024)
        
        # Calculate percentages
        total = stats['total_requests']
        if total > 0:
            stats['bot_percentage'] = (stats['bot_requests'] / total) * 100
            stats['user_percentage'] = (stats['user_requests'] / total) * 100
            stats['success_percentage'] = (stats['success_requests'] / total) * 100
            stats['redirect_percentage'] = (stats['redirect_requests'] / total) * 100
            stats['client_error_percentage'] = (stats['client_error_requests'] / total) * 100
            stats['server_error_percentage'] = (stats['server_error_requests'] / total) * 100
        
        # Top errors
        stats['top_error_paths'] = stats['top_error_paths'].most_common(20)
        
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