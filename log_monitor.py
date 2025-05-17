#!/usr/bin/env python
import time
import os
import argparse
import subprocess
from datetime import datetime
from dashboard_data_generator import generate_dashboard_data

def monitor_log_file(log_file, output_dir, interval=60):
    """
    Monitor the log file for changes and regenerate dashboard data when changes are detected.
    
    Args:
        log_file (str): Path to the log file to monitor
        output_dir (str): Directory to output dashboard data
        interval (int): Polling interval in seconds
    """
    if not os.path.exists(log_file):
        print(f"Error: Log file '{log_file}' not found")
        return
    
    print(f"Starting to monitor {log_file}")
    print(f"Dashboard data will be generated in {output_dir}")
    print(f"Polling interval: {interval} seconds")
    print(f"Press Ctrl+C to stop monitoring\n")
    
    last_modified = os.path.getmtime(log_file)
    last_size = os.path.getsize(log_file)
    
    while True:
        try:
            current_modified = os.path.getmtime(log_file)
            current_size = os.path.getsize(log_file)
            
            if current_modified > last_modified or current_size != last_size:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Log file changed, regenerating dashboard data...")
                
                # Generate dashboard data
                generate_dashboard_data(log_file, output_dir)
                
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Dashboard data updated successfully")
                
                # Update last modified time and size
                last_modified = current_modified
                last_size = current_size
            
            time.sleep(interval)
            
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description='Monitor NGINX log file and update dashboard data')
    parser.add_argument('log_file', help='Path to the NGINX access log file to monitor')
    parser.add_argument('--output-dir', '-o', help='Output directory for dashboard data',
                        default='nginx-dashboard/public/data')
    parser.add_argument('--interval', '-i', type=int, help='Polling interval in seconds', default=60)
    parser.add_argument('--run-dashboard', '-d', action='store_true', 
                        help='Start the Next.js dashboard server')
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Generate initial dashboard data
    print(f"Generating initial dashboard data...")
    generate_dashboard_data(args.log_file, args.output_dir)
    
    # Start Next.js dashboard server if requested
    if args.run_dashboard:
        try:
            print(f"Starting Next.js dashboard server...")
            dashboard_process = subprocess.Popen(
                'cd nginx-dashboard && npm run dev',
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            print(f"Dashboard server started. Visit http://localhost:3000 to view the dashboard.")
        except Exception as e:
            print(f"Failed to start dashboard server: {e}")
    
    # Start monitoring the log file
    monitor_log_file(args.log_file, args.output_dir, args.interval)
    
    # Terminate dashboard server if it was started
    if args.run_dashboard and 'dashboard_process' in locals():
        dashboard_process.terminate()
        print("Dashboard server stopped")

if __name__ == "__main__":
    main()