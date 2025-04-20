#!/bin/bash
# This script fixes line endings for all shell and Python scripts
# Run this script manually before building the Docker image

echo "Fixing line endings in scripts..."

# Find and fix all shell scripts
find . -type f -name "*.sh" | while read file; do
  echo "Fixing $file"
  sed -i 's/\r$//' "$file"
done

# Find and fix all Python scripts
find . -type f -name "*.py" | while read file; do
  echo "Fixing $file"
  sed -i 's/\r$//' "$file"
done

# Specifically fix run scripts in the services directory
find ./rootfs -type f -name "run" | while read file; do
  echo "Fixing $file"
  sed -i 's/\r$//' "$file"
done

echo "Done!"