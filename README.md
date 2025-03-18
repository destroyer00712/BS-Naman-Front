# BSGold Dashboard Testing Project

This repository contains a comprehensive testing solution for the BSGold Dashboard, including automated tests, test plans, and documentation.

## Project Structure

```
bsgold-dashboard-testing/
├── dashboard-test-automation.js    # Main automation script
├── test-automation/                # Test automation files
│   ├── package.json                # Dependencies for automation
│   └── ...
├── test-report-template.md         # Template for test reports
├── dashboard-test-plan.md          # Comprehensive test plan
├── audio-sending-explanation.md    # Detailed explanation of audio sending
├── dashboard-test-readme.md        # Instructions for running tests
└── README.md                       # This file
```

## Overview

The BSGold Dashboard is a web application for managing jewelry orders, communicating with clients and workers, and tracking order status. This testing project provides tools and documentation to ensure the dashboard functions correctly.

## Features Tested

The testing suite covers the following features:

1. **Dashboard Loading** - Tests if the dashboard loads correctly
2. **Orders Sidebar** - Tests if the orders sidebar loads and displays orders
3. **Order Selection** - Tests if selecting an order works correctly
4. **Chat Window Functionality** - Tests the chat input and send button
5. **Order Details** - Tests the order details panel, worker selection, and status toggle
6. **Voice Message Dialog** - Tests the voice message recording functionality
7. **Worker Assignment** - Tests the worker assignment dropdown
8. **Order Status Toggle** - Tests the order status toggle
9. **Order Filtering** - Tests the order filtering buttons
10. **Real-time Updates** - Tests the Socket.IO connection for real-time updates

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/bsgold-dashboard-testing.git
cd bsgold-dashboard-testing
```

2. Install dependencies:
```bash
cd test-automation
npm install
```

### Running the Tests

1. Make sure the BSGold Dashboard is running at the URL specified in the config (default: http://localhost:3000)
2. Run the test script:
```bash
node ../dashboard-test-automation.js
```

3. View the test report in `test-report.md`

## Documentation

This project includes several documentation files:

- **dashboard-test-plan.md**: A comprehensive test plan outlining the testing strategy, objectives, and schedule
- **audio-sending-explanation.md**: A detailed explanation of the audio sending functionality
- **dashboard-test-readme.md**: Instructions for running the automated tests
- **test-report-template.md**: A template for test reports

## Audio Sending Functionality

The audio sending functionality allows users to record and send voice messages to clients and workers via WhatsApp. For a detailed explanation, see [audio-sending-explanation.md](./audio-sending-explanation.md).

## Test Automation

The test automation script uses Puppeteer to automate browser interactions and test the dashboard features. It generates a detailed report of what is working and what isn't.

### Key Features of the Automation:

- **Non-destructive Testing**: The automation is designed to test features without making actual changes to the data
- **Screenshot Capture**: Automatically captures screenshots when errors occur
- **Detailed Reporting**: Generates a comprehensive report of test results
- **Configurable**: Easily configurable to test different environments

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact [your-email@example.com].
