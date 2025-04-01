// config.js
const config = {
    API_ROOT: 'https://bsgold-api.chatloom.in',
    SOCKET_IO_SERVER_URL:'https://bsgold-api.chatloom.in',
    WHATSAPP_API_ROOT: 'https://graph.facebook.com/v18.0',
    WHATSAPP_ACCESS_TOKEN: 'EAATMXEvo8GwBOyJtYfhZCyeFWtuBxX8z236OT8mZC2ArAXiGMf9hOHQz44i6Y0XOxqWwuUL7wVTEfAv5hDfCWDsGNIgMqxg5cmomBgpkVZA3s0xaGXLGb7AftsOXFGMf1T7WkZB54T5VZAsQ0bGJCy8IKvJlysZBTZC1QPI8h5laEIQ5rbLEtMZBTC50coCnkjxwcwZDZD',
    WHATSAPP_PHONE_ID: '/489702420894118',
    ENDPOINTS: {
        ORDERS: '/api/orders',
        CLIENT_DETAILS: (phone) => `/api/clients/${phone}`,
        ORDER_MESSAGES: (orderId) => `/api/messages/order/${orderId}`,
        WHATSAPP_MEDIA: (mediaId) => `${config.WHATSAPP_API_ROOT}/${mediaId}`,
        WORKERS: '/api/workers',
        WORKER_DETAILS: (phone) => `/api/workers/${phone}`,
        MESSAGES: '/api/messages'
    },
    WHATSAPP_ENDPOINTS:{
        MESSAGES: '/messages',
        MEDIA: '/media'
    },
    SENDER_COLORS: {
        client: '#E3F2FD',  // Light blue for client messages
        worker: '#FFE0B2',  // Light orange for worker messages
        enterprise: '#E8F5E9',  // Light green for enterprise messages
        forwarded: '#FFF3E0'  // Light orange for forwarded messages
    },
    MEDIA_TYPES: {
        AUDIO: 'audio/ogg',
        VIDEO: 'video/mp4',
        IMAGE: 'image/jpeg'
    }
};

export default config;