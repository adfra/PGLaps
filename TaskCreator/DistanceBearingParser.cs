using System.Globalization;

namespace PGLaps
{
    public class DistanceBearingParser
    {

        public List<DistanceAngleWPRadius> Parse(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                throw new ArgumentException("Input string cannot be null or empty.", nameof(input));
            }

            return input.Split('|')
                .Select(triplet => triplet.Trim().Split(','))
                .Select(values => new DistanceAngleWPRadius(
                    ParseDouble(values[0]),
                    ParseDouble(values[1]),
                    ParseDouble(values[2])
                    )
                )
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
