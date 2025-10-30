
import axios from 'axios';

// SMS Configuration
const API_KEY = process.env.SMSIR_API_KEY || 'uQ6kILuXjqPZEurDS3bos6uZMRDRGdGcnIhOjyuEClrXdBl3';
const LINE_NUMBER = process.env.SMSIR_LINE_NUMBER || '3000349269';
const SMSIR_API_URL = 'https://api.sms.ir/v1';





export async function sendVisitorSMS(phoneNumber, visitorName) {
    try {

        const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
        const website = 'https://bonyanx.com';
        // Format for SMS.ir (Iranian phone numbers)
        const formattedPhoneNumber = cleanPhoneNumber.startsWith('0') 
            ? cleanPhoneNumber 
            : cleanPhoneNumber.startsWith('98') 
            ? '0' + cleanPhoneNumber.substring(1) 
            : '0' + cleanPhoneNumber;
        const message = `  ${visitorName} عزیز ، ضمن سپاس و قدردانی از  حضور شما در بازدید از غرفه ی گروه بنیان ، خواهشمند است که برای دریافت اطلاعات بیشتر و پیشنهادات و انتقادات ، به صفحه ی وبسایت ${website} مراجعه نمایید.`;


        var data = JSON.stringify({
            "lineNumber": 3000349269,
            "messageText": message,
            "mobiles": [formattedPhoneNumber],
            "sendDateTime": null
        });
        var config = {method:'post', 
                     url: 'https://api.sms.ir/v1/send/bulk',
                     headers: {            
                        'X-API-KEY': 'uQ6kILuXjqPZEurDS3bos6uZMRDRGdGcnIhOjyuEClrXdBl3',            
                        'Content-Type': 'application/json'          
                    },          
                    data : data        
                };        
                axios(config)        
                .then(function (response) {          
                    console.log(JSON.stringify(response.data));        
                })        
                .catch(function (error) {          
                    console.log(error);        
                });

        console.log(`SMS sent successfully to ${formattedPhoneNumber}:`, result.data);
        return {
            success: true,
            messageId: result.data.MessageId || result.data.status,
            phoneNumber: formattedPhoneNumber
        };
    } catch (error) {
        console.error('SMS sending failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.Message || error.message,
            phoneNumber: phoneNumber
        };
    }
}




// /**
//  * Send bulk SMS to multiple visitors
//  * @param {Array} visitors - Array of visitor objects with phone and name
//  * @param {string} exhibitionName - Name of the exhibition
//  * @returns {Promise<Array>} - Array of SMS results
//  */
// export async function sendBulkSMS(visitors, exhibitionName = 'Exhibition') {
//     const results = [];
    
//     for (const visitor of visitors) {
//         if (visitor.phone) {
//             const result = await sendVisitorSMS(visitor.phone, visitor.name, exhibitionName);
//             results.push({
//                 visitorId: visitor.id,
//                 visitorName: visitor.name,
//                 ...result
//             });
//         }
//     }
    
//     return results;
// }

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
export function validatePhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if it's a valid international format
    return /^\+?[1-9]\d{1,14}$/.test(cleaned);
}
