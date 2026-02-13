'use client'

import { ProjectStatus } from "./project"

export interface TemplateTask {
    name: string
    description: string
    priority: 'low' | 'medium' | 'high'
}

export interface ProjectTemplate {
    id: string
    name: string
    description: string
    defaultStatus: ProjectStatus
    tasks: TemplateTask[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'website-dev',
        name: 'Website Development',
        description: 'Standard workflow for building a new website.',
        defaultStatus: 'lead',
        tasks: [
            { name: 'Requirement Gathering', description: 'Meet with client to define scope and goals.', priority: 'high' },
            { name: 'Design Phase', description: 'Create wireframes and high-fidelity mockups.', priority: 'medium' },
            { name: 'Development', description: 'Implement the design and functionality.', priority: 'high' },
            { name: 'QA & Testing', description: 'Test for bugs and responsiveness.', priority: 'medium' },
            { name: 'Deployment', description: 'Go live and handle final adjustments.', priority: 'high' }
        ]
    },
    {
        id: 'seo-audit',
        name: 'SEO Audit & Optimization',
        description: 'Analysis and optimization of an existing website.',
        defaultStatus: 'active',
        tasks: [
            { name: 'Technical SEO Audit', description: 'Identify technical issues impacting rankings.', priority: 'high' },
            { name: 'Keyword Research', description: 'Find relevant keywords for the target audience.', priority: 'medium' },
            { name: 'On-Page Optimization', description: 'Update titles, meta tags, and content.', priority: 'medium' },
            { name: 'Backlink Analysis', description: 'Review the current link profile.', priority: 'low' }
        ]
    },
    {
        id: 'social-media',
        name: 'Social Media Strategy',
        description: 'Planning and execution of social media campaigns.',
        defaultStatus: 'lead',
        tasks: [
            { name: 'Content Strategy', description: 'Define content pillars and posting schedule.', priority: 'high' },
            { name: 'Visual Asset Creation', description: 'Generate graphics and videos for posts.', priority: 'medium' },
            { name: 'Scheduling & Posting', description: 'Automate or manually post content.', priority: 'medium' },
            { name: 'Engagement & Reporting', description: 'Respond to comments and track performance.', priority: 'low' }
        ]
    }
]
