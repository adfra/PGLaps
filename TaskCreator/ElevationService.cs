using System;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

// TO USE THIS:
//var service = new ElevationService();
//double elevation = await service.GetElevationAsync(37.7749, -122.4194);
//Console.WriteLine($"Elevation: {elevation} meters");


public class ElevationService
{
    private const string API_KEY = "YOUR_API_KEY";
    private const string BASE_URL = "https://maps.googleapis.com/maps/api/elevation/json";

    public async Task<double> GetElevationAsync(double latitude, double longitude)
    {
        using (var client = new HttpClient())
        {
            string url = $"{BASE_URL}?locations={latitude},{longitude}&key={API_KEY}";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();

            var json = JObject.Parse(responseBody);
            return (double)json["results"][0]["elevation"];
        }
    }
}
