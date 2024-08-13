using System.Globalization;

namespace TaskTransposer
{
    public class DistanceBearingParser
    {
        public class DistanceBearing
        {
            public double Distance { get; set; }
            public double Bearing { get; set; }

            public DistanceBearing(double distance, double bearing)
            {
                Distance = distance;
                Bearing = bearing;
            }
        }

        public List<DistanceBearing> Parse(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                throw new ArgumentException("Input string cannot be null or empty.", nameof(input));
            }

            return input.Split('|')
                .Select(pair => pair.Trim().Split(','))
                .Select(values => new DistanceBearing(
                    ParseDouble(values[0]),
                    ParseDouble(values[1])))
                .ToList();
        }

        private double ParseDouble(string value)
        {
            if (!double.TryParse(value.Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out double result))
            {
                throw new FormatException($"Unable to parse '{value}' as a double.");
            }
            return result;
        }
    }
}
