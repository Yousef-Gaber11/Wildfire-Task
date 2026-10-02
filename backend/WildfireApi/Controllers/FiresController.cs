using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Collections.Generic;
using System.Text.Json;
using WildfireApi.Models;

namespace WildfireApi.Controllers
{
    [Route("api/fires")]
    [ApiController]
    public class FiresController : ControllerBase
    {
        private readonly string filePath;

        public FiresController()
        {
            // Resolve the project root directory to ensure the JSON file is saved cleanly outside
            var projectRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../"));
            filePath = Path.Combine(projectRoot, "saved_fires.json");
        }

        [HttpPost]
        public IActionResult SaveFires([FromBody] List<FireData> incomingFires)
        {
            // Validate that the incoming payload is not null or empty
            if (incomingFires == null || incomingFires.Count == 0)
            {
                return BadRequest(new { message = "No data received." });
            }

            List<FireData> existingFires = new List<FireData>();

            // Check if the persisted JSON file already exists in the root directory
            if (System.IO.File.Exists(filePath))
            {
                try
                {
                    // Read existing content to append new data without overwriting historical records
                    string existingJson = System.IO.File.ReadAllText(filePath);
                    if (!string.IsNullOrEmpty(existingJson))
                    {
                        existingFires = JsonSerializer.Deserialize<List<FireData>>(existingJson) ?? new List<FireData>();
                    }
                }
                catch (System.Exception)
                {
                    // Fallback to an empty list if file corruption or parsing error occurs
                    existingFires = new List<FireData>();
                }
            }

            // Merge incoming fires with existing records
            existingFires.AddRange(incomingFires);

            // Serialize and write the updated list back to disk with pretty-print indentation
            string updatedJson = JsonSerializer.Serialize(existingFires, new JsonSerializerOptions { WriteIndented = true });
            System.IO.File.WriteAllText(filePath, updatedJson);

            // Return a success response with the total count of stored records
            return Ok(new { message = "Data successfully saved and updated in the external storage file.", count = existingFires.Count });
        }
    }
}