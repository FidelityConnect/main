/**
 * Checks if the given email address exists in the emailList array and validates the license based on the date.
 * @param {string} email - The email address to check.
 * @returns {Object} - An object with a statusCode and message.
 */
exports.handler = async (event) => {
    try {
        const { email } = JSON.parse(event.body);

        const emailList = [
            { email: "john@example.com", time: "2023-01-01" },
            { email: "jane@example.com", time: "2023-02-01" },
            { email: "admin@admin.com", time: "2024-08-04" },
            { email: "njokinjuguna23@gmail.com", time: "2024-07-01" },
            { email: "freckles@gmail.com", time: "2024-07-01" },
            { email: "boznia@gmail.com", time: "2024-07-01" },
        ];

        const foundEmail = emailList.find((item) => item.email === email);

        if (foundEmail) {
            const currentTime = new Date().toISOString().split('T')[0];
            const { time } = foundEmail;

            if (time < currentTime) {
                return {
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    statusCode: 400,
                    body: JSON.stringify({ message: "License is invalid." }),
                };
            } else {
                return {
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    statusCode: 200,
                    body: JSON.stringify({ message: "License is valid.", ...foundEmail }),
                };
            }
        } else {
            return {
                headers: {
                    "Access-Control-Allow-Origin": "*"
                },
                statusCode: 404,
                body: JSON.stringify({ message: "Email not found in the list." }),
            };
        }
    } catch (error) {
        return {
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid request body." }),
        };
    }
};
