import fitz

input_pdf = "/Users/minwokim/Downloads/3KR01015_20260611175157_S_1of1.pdf"
output_pdf = "/Users/minwokim/Downloads/3KR01015_20260611175157_S_1of1_clean.pdf"

doc = fitz.open(input_pdf)
page = doc[0]

# Get the list of content stream xrefs
contents = page.get_contents()
print(f"Original content streams: {contents}")

# Keep only the first two streams (Stream 1 and Stream 2) which contain the document layout and images.
# Stream 3 and Stream 4 draw the 'Gmarket' watermark and the UUID.
clean_contents = contents[:2]
print(f"Cleaned content streams: {clean_contents}")

# Apply the cleaned contents list to the page
page.set_contents(clean_contents)

# Save the cleaned PDF
doc.save(output_pdf)
doc.close()

print(f"Watermark successfully removed! Saved to: {output_pdf}")
