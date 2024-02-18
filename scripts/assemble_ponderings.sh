#!/bin/bash
# Script to create the structured ponderings file (for website) from a raw text file (which holds the data, split by "\n\n")

# Check if file name is provided
if [ $# -eq 0 ]; then
    echo "Please provide a text file as input"
    exit 1
fi

# Check if file exists
if [ ! -f "$1" ]; then
    echo "$1 is not a valid file"
    exit 1
fi


# Configure Output File + Append Header for website markdown
output_file="collections/_projects/ponderings.md" #assumes script is run from root project dir
header_for_file=$(cat <<-END
---
layout: project-minimal # alternative layouts: project, project-left, project-right, project-top, project-minimal

title: "Ponderings"

description: "Thought experiments, fun questions & more"

weight: 3
---
END
)

echo -e "$header_for_file\n\n" > "$output_file"


# Initialize counter
i=1

# Read file line by line + write to outfile
while IFS= read -r line
do
    # Skip empty lines
    if [ -z "$line" ]; then
        continue
    fi

    # Write line to output file with number
    echo -e "$i. $line\n" >> "$output_file"
    # Increment counter
    ((i++))
done < "$1"

echo "File is created with the name $output_file"

