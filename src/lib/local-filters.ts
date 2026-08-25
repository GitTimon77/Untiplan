export const LEGACY_COURSE_FILTER_STORAGE_KEY = "untiplan.course-filter.v1";
export function courseFilterStorageKey(filterStorageId: string) {
  return `untiplan.course-filter.v2.${filterStorageId}`;
}

export type CourseFilter = {
  selectedCourseKeys: string[];
  filterEnabled: boolean;
};

const emptyFilter = (): CourseFilter => ({ selectedCourseKeys: [], filterEnabled: false });
const courseKeyPattern = /^\d+-\d+$/;

export function normalizeCourseFilter(value: unknown): CourseFilter {
  if (!value || typeof value !== "object") return emptyFilter();

  const candidate = value as Partial<CourseFilter>;
  if (!Array.isArray(candidate.selectedCourseKeys) || typeof candidate.filterEnabled !== "boolean") {
    return emptyFilter();
  }

  const selectedCourseKeys = [...new Set(candidate.selectedCourseKeys.filter(
    (key): key is string => typeof key === "string" && courseKeyPattern.test(key),
  ))].slice(0, 2000);

  return { selectedCourseKeys, filterEnabled: candidate.filterEnabled && selectedCourseKeys.length > 0 };
}

export function parseCourseFilter(value: string | null): CourseFilter {
  if (!value) return emptyFilter();
  try {
    return normalizeCourseFilter(JSON.parse(value));
  } catch {
    return emptyFilter();
  }
}

export function serializeCourseFilter(value: CourseFilter) {
  return JSON.stringify(normalizeCourseFilter(value));
}
