# NGINX Dashboard TODO

## Visualization Improvements
- [x] Fix Traffic Transferred (MB) hourly plot to respect selected day
- [x] Fix Error Timeline (Hourly) to respect selected day
- [x] Improve all plots with more detailed tooltips and information
- [x] Add more descriptive legends to all charts
- [x] Add hover explanations to charts and key metrics
- [x] Increase width of components like Top Endpoints, Top IPs, etc.
- [x] Add data source information below charts

## Bot Traffic Page Enhancements
- [x] Add geographical distribution of bot traffic
- [x] Add bot classification breakdown (good bots vs. malicious)
- [x] Create bot traffic timeline to show patterns over time
- [x] Add bot request pattern analysis
- [x] Show most targeted endpoints by bots
- [x] Compare response times: bot traffic vs. user traffic
- [x] Add bot user-agent correlation analysis

## Additional Dashboard Improvements
- [x] Implement heatmap for traffic patterns by hour/day of week
- [x] Add Sankey diagram showing traffic flow
- [x] Create radar chart for comparing metrics across time periods
- [x] Implement treemap for visualizing file types
- [x] Add stacked area chart for traffic composition
- [x] Implement parallel coordinates for multi-dimensional analysis  
- [x] Add bubble chart for correlating request properties
- [x] Implement customizable dashboard with draggable widgets
- [x] Add fullscreen mode for individual charts
- [x] Create custom theme selector with branded themes
- [x] Implement IP geolocation visualization
- [x] Add anomaly detection in request patterns
- [x] Implement cross-filtering between charts

## Database Management
- [x] Create database cleanup functionality
- [x] Fix import from database functionality
- [x] Update the page to use database data exclusively
- [x] Implement database status monitoring
- [x] Remove static JSON files and use only database-driven approach