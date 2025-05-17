import json
from log_parser import NginxLogParser
import os
import argparse
from datetime import datetime

def generate_dashboard_data(log_file, output_dir):
    """Generate formatted data for the Next.js dashboard."""
    # Parse the log file
    parser = NginxLogParser(log_file)
    parser.parse_logs()
    stats = parser.get_statistics()
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate data files for different visualizations
    
    # 1. Status code distribution
    status_data = [
        {"status": str(status), "count": count}
        for status, count in stats['status_distribution'].items()
    ]
    with open(os.path.join(output_dir, 'status_codes.json'), 'w') as f:
        json.dump(status_data, f, indent=2)
    
    # 2. Requests timeline
    timeline_data = [
        {"hour": hour, "count": count}
        for hour, count in stats['requests_timeline']
    ]
    with open(os.path.join(output_dir, 'requests_timeline.json'), 'w') as f:
        json.dump(timeline_data, f, indent=2)
    
    # 3. Top endpoints
    endpoint_data = [
        {"endpoint": endpoint, "count": count}
        for endpoint, count in stats['top_endpoints'][:20]  # Top 20 endpoints
    ]
    with open(os.path.join(output_dir, 'top_endpoints.json'), 'w') as f:
        json.dump(endpoint_data, f, indent=2)
    
    # 4. Top IP addresses
    ip_data = [
        {"ip": ip, "count": count}
        for ip, count in stats['top_ips'][:20]  # Top 20 IPs
    ]
    with open(os.path.join(output_dir, 'top_ips.json'), 'w') as f:
        json.dump(ip_data, f, indent=2)
    
    # 5. Top user agents
    user_agent_data = [
        {"user_agent": user_agent, "count": count}
        for user_agent, count in stats['top_user_agents'][:20]  # Top 20 user agents
    ]
    with open(os.path.join(output_dir, 'top_user_agents.json'), 'w') as f:
        json.dump(user_agent_data, f, indent=2)
    
    # 6. Summary statistics
    summary_data = {
        "total_requests": stats['total_requests'],
        "total_transferred_mb": round(stats['total_transferred_mb'], 2),
        "unique_ips": len(stats['ip_addresses']),
        "unique_endpoints": len(stats['endpoints']),
        "generated_at": datetime.now().isoformat()
    }
    with open(os.path.join(output_dir, 'summary.json'), 'w') as f:
        json.dump(summary_data, f, indent=2)
    
    # 7. HTTP methods distribution
    methods_counter = {}
    for log in parser.parsed_logs:
        method = log.get('method', '')
        if method:
            methods_counter[method] = methods_counter.get(method, 0) + 1
    
    method_data = [
        {"method": method, "count": count}
        for method, count in sorted(methods_counter.items(), key=lambda x: x[1], reverse=True)
    ]
    with open(os.path.join(output_dir, 'http_methods.json'), 'w') as f:
        json.dump(method_data, f, indent=2)
    
    print(f"Generated dashboard data files in {output_dir}")
    return output_dir

def main():
    parser = argparse.ArgumentParser(description='Generate dashboard data from NGINX logs')
    parser.add_argument('log_file', help='Path to the NGINX access log file (can be gzipped)')
    parser.add_argument('--output-dir', '-o', help='Output directory for dashboard data files', 
                        default='nginx-dashboard/public/data')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.log_file):
        print(f"Error: Log file '{args.log_file}' not found")
        return
    
    generate_dashboard_data(args.log_file, args.output_dir)

if __name__ == "__main__":
    main()