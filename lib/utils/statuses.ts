export const getStatusColor = (status: string) => {
    switch (status) {
        case "draft":
            return "text-gray-600 bg-gray-50 border-gray-200"
        case "submitted":
            return "text-blue-600 bg-blue-50 border-blue-200"
        case "under_review":
            return "text-orange-600 bg-orange-50 border-orange-200"
        case "rejected":
            return "text-red-600 bg-red-50 border-red-200"
        case "approved":
            return "text-green-600 bg-green-50 border-green-200"
        case "withdrawn":
            return "text-purple-600 bg-purple-50 border-purple-200"
        case "archived":
            return "text-gray-600 bg-gray-50 border-gray-200"
        case "active":
            return "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200"
        default:
            return ""
    }
}

export const getPaymentColor = (payment: string) => {
    switch (payment) {
        case "unpaid":
            return "bg-red-500"
        case "paid":
            return "bg-green-500"
        case "failed":
        case "processing":
            return "bg-orange-500"
        default:
            return "bg-gray-500"
    }
}

