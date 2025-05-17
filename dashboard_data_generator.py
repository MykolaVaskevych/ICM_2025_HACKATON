import json
from log_parser import NginxLogParser
import os
import argparse
from datetime import datetime
from collections import Counter, defaultdict

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
    
    # 2. Requests timeline (hourly)
    timeline_data = [
        {"hour": hour, "count": count}
        for hour, count in stats['requests_timeline']
    ]
    with open(os.path.join(output_dir, 'requests_timeline.json'), 'w') as f:
        json.dump(timeline_data, f, indent=2)
    
    # 3. Daily requests timeline
    daily_data = [
        {"date": day, "count": count}
        for day, count in stats['daily_requests']
    ]
    with open(os.path.join(output_dir, 'daily_requests.json'), 'w') as f:
        json.dump(daily_data, f, indent=2)
    
    # 4. Traffic per hour (in MB)
    traffic_data = [
        {"hour": hour, "megabytes": round(mb, 2)}
        for hour, mb in stats['traffic_timeline_mb']
    ]
    with open(os.path.join(output_dir, 'traffic_timeline.json'), 'w') as f:
        json.dump(traffic_data, f, indent=2)
    
    # 5. Top endpoints
    endpoint_data = [
        {"endpoint": endpoint, "count": count}
        for endpoint, count in stats['top_endpoints']  # All top endpoints
    ]
    with open(os.path.join(output_dir, 'top_endpoints.json'), 'w') as f:
        json.dump(endpoint_data, f, indent=2)
    
    # 6. Top IP addresses
    ip_data = [
        {"ip": ip, "count": count}
        for ip, count in stats['top_ips']  # All top IPs
    ]
    with open(os.path.join(output_dir, 'top_ips.json'), 'w') as f:
        json.dump(ip_data, f, indent=2)
    
    # 7. Top user agents
    user_agent_data = [
        {"user_agent": user_agent, "count": count}
        for user_agent, count in stats['top_user_agents']
    ]
    with open(os.path.join(output_dir, 'top_user_agents.json'), 'w') as f:
        json.dump(user_agent_data, f, indent=2)
    
    # 8. File type distribution
    file_type_data = [
        {"type": file_type, "count": count}
        for file_type, count in stats['top_file_types']
    ]
    with open(os.path.join(output_dir, 'file_types.json'), 'w') as f:
        json.dump(file_type_data, f, indent=2)
    
    # 9. Bot vs User distribution
    bot_user_data = [
        {"type": "Bot", "count": stats['bot_requests'], "percentage": round(stats['bot_percentage'], 1)},
        {"type": "User", "count": stats['user_requests'], "percentage": round(stats['user_percentage'], 1)}
    ]
    with open(os.path.join(output_dir, 'bot_user.json'), 'w') as f:
        json.dump(bot_user_data, f, indent=2)
    
    # 10. HTTP methods distribution
    method_data = [
        {"method": method, "count": count}
        for method, count in stats['top_http_methods']
    ]
    with open(os.path.join(output_dir, 'http_methods.json'), 'w') as f:
        json.dump(method_data, f, indent=2)
    
    # 11. Path depth distribution
    path_depth_data = [
        {"depth": depth, "count": count}
        for depth, count in stats['path_depth_distribution']
    ]
    with open(os.path.join(output_dir, 'path_depth.json'), 'w') as f:
        json.dump(path_depth_data, f, indent=2)
    
    # 12. Protocol version distribution
    protocol_data = [
        {"protocol": protocol, "count": count}
        for protocol, count in stats['protocol_distribution'].items()
    ]
    with open(os.path.join(output_dir, 'protocols.json'), 'w') as f:
        json.dump(protocol_data, f, indent=2)
    
    # 13. Top error paths with enhanced data
    # Extract common status codes for each error path
    error_paths_with_status = []
    for path, count in stats['top_error_paths']:
        # Find the most common status code for this path
        path_status_counts = Counter()
        for log in parser.parsed_logs:
            if log.get('path') == path and int(log.get('status', 0)) >= 400:
                path_status_counts[log.get('status')] += 1
        
        # Get the most common status code
        most_common_status = path_status_counts.most_common(1)[0][0] if path_status_counts else 'Unknown'
        
        error_paths_with_status.append({
            "path": path, 
            "count": count,
            "status": most_common_status,
            "status_distribution": dict(path_status_counts)
        })
    
    with open(os.path.join(output_dir, 'error_paths.json'), 'w') as f:
        json.dump(error_paths_with_status, f, indent=2)
    
    # 14. IP classification
    ip_class_data = [
        {"class": ip_class, "count": count}
        for ip_class, count in stats['ip_classification'].items()
    ]
    with open(os.path.join(output_dir, 'ip_classification.json'), 'w') as f:
        json.dump(ip_class_data, f, indent=2)
    
    # 15. Top referrers
    referrer_data = [
        {"referrer": referrer, "count": count}
        for referrer, count in stats['top_referers']
    ]
    with open(os.path.join(output_dir, 'top_referrers.json'), 'w') as f:
        json.dump(referrer_data, f, indent=2)
    
    # 16. Status code category distribution
    status_category_data = [
        {"category": "Success (2xx)", "count": stats['success_requests'], "percentage": round(stats['success_percentage'], 1)},
        {"category": "Redirect (3xx)", "count": stats['redirect_requests'], "percentage": round(stats['redirect_percentage'], 1)},
        {"category": "Client Error (4xx)", "count": stats['client_error_requests'], "percentage": round(stats['client_error_percentage'], 1)},
        {"category": "Server Error (5xx)", "count": stats['server_error_requests'], "percentage": round(stats['server_error_percentage'], 1)}
    ]
    with open(os.path.join(output_dir, 'status_categories.json'), 'w') as f:
        json.dump(status_category_data, f, indent=2)
    
    # 17. Complete dataset for filtering (limit to first 5000 entries for performance)
    filtered_logs = []
    for log in parser.parsed_logs[:5000]:  # Limit for performance
        filtered_log = {
            "timestamp": log.get('datetime_obj').isoformat() if log.get('datetime_obj') else None,
            "ip": log.get('ip'),
            "method": log.get('method'),
            "path": log.get('path'),
            "status": log.get('status'),
            "bytes": log.get('bytes'),
            "user_agent": log.get('user_agent'),
            "is_bot": log.get('is_bot'),
            "referrer": log.get('referrer'),
            "file_extension": log.get('file_extension'),
            "hour": log.get('hour')
        }
        filtered_logs.append(filtered_log)
    
    with open(os.path.join(output_dir, 'filtered_logs.json'), 'w') as f:
        json.dump(filtered_logs, f, indent=2)
    
    # 18. Summary statistics with enhanced metrics
    summary_data = {
        "total_requests": stats['total_requests'],
        "total_transferred_mb": round(stats['total_transferred_mb'], 2),
        "unique_ips": len(stats['ip_addresses']),
        "unique_endpoints": len(stats['endpoints']),
        "bot_percentage": round(stats['bot_percentage'], 1),
        "success_percentage": round(stats['success_percentage'], 1),
        "error_percentage": round(stats['client_error_percentage'] + stats['server_error_percentage'], 1),
        "most_common_status": str(stats['status_codes'].most_common(1)[0][0]) if stats['status_codes'] else "None",
        "most_common_method": stats['top_http_methods'][0][0] if stats['top_http_methods'] else "None",
        "most_popular_endpoint": stats['top_endpoints'][0][0] if stats['top_endpoints'] else "None",
        "generated_at": datetime.now().isoformat()
    }
    with open(os.path.join(output_dir, 'summary.json'), 'w') as f:
        json.dump(summary_data, f, indent=2)
        
    # 19. Raw statistics for advanced filtering
    with open(os.path.join(output_dir, 'raw_stats.json'), 'w') as f:
        # Need to convert some data structures for JSON serialization
        json_safe_stats = {}
        for key, value in stats.items():
            if isinstance(value, (Counter, defaultdict)):
                json_safe_stats[key] = dict(value)
            else:
                json_safe_stats[key] = value
        json.dump(json_safe_stats, f, indent=2)
    
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