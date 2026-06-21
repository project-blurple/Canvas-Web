/**
 * Downloads data as a JSON file
 * @param data The data to download
 * @param filename The filename for the downloaded file
 */
export function downloadAsJson(data: unknown, filename: string): void {
  // Create blob from JSON
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
}
