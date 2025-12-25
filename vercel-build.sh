#!/bin/bash

# Exit on any error
set -e

# Install dependencies
npm ci

# Build the project
npm run build