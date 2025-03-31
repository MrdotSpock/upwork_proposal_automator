const axios=require('axios');

// Configuration object for Upwork API
const config={
    clientId: process.env.UPWORK_CLIENT_ID,
    clientSecret: process.env.UPWORK_CLIENT_SECRET,
    accessToken: process.env.UPWORK_ACCESS_TOKEN
};

class UpworkJobFetcher {
    constructor(config) {
        this.config=config;
        this.client=axios.create({
            baseURL: 'https://www.upwork.com/api/v1/',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async searchJobs(params={}) {
        try {
            const defaultParams={
                q: 'javascript developer', // default search query
                page: 0,
                page_size: 20,
                sort: 'recency'
            };

            const searchParams={...defaultParams,...params};
            const response=await this.client.get('jobs/search.json',{
                params: searchParams
            });

            return response.data.jobs;
        } catch(error) {
            console.error('Error fetching jobs from Upwork:',error.message);
            throw error;
        }
    }
}

async function fetchJobs(searchParams={}) {
    try {
        const fetcher=new UpworkJobFetcher(config);
        const jobs=await fetcher.searchJobs(searchParams);

        return jobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description,
            budget: {
                amount: job.budget,
                type: job.job_type
            },
            skills: job.skills,
            clientInfo: {
                rating: job.client.rating,
                reviews: job.client.total_reviews,
                location: job.client.location,
                totalSpent: job.client.total_spent
            },
            postedTime: job.created_time,
            url: `https://www.upwork.com/jobs/${job.id}`
        }));
    } catch(error) {
        console.error('Error in fetchJobs:',error);
        throw error;
    }
}

module.exports={
    fetchJobs
}; 